import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { ACTOR_INSTAGRAM, CHAVE_ACERVO, ETIQUETA_ACERVO, KV_STORE, gravarKV, lerKV, rodarActor, temToken } from "@/apify/cliente";
import { inputInstagram, type Cadencia } from "@/apify/input";
import { coletarDocumentais } from "@/dados/documentais";
import { montarAcervo } from "@/dados/montar";
import type { Acervo } from "@/core/tipos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CADENCIAS: Cadencia[] = ["tempo_real", "diario", "3_dias", "10_dias"];

/**
 * Dispara uma coleta na Apify, fora da agenda.
 *
 * A coleta de rotina NÃO passa por aqui: ela é agendada na própria Apify
 * (`npm run provisionar`), que é onde a coleta acontece. Isto existe para
 * forçar uma coleta à mão — depois de mexer na lista fechada, ou quando um
 * bloqueio do Instagram derrubou a run anterior.
 *
 * A run é assíncrona; quem monta o snapshot é o webhook.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const cadencia = (url.searchParams.get("cadencia") ?? "tempo_real") as Cadencia;

  if (!autorizado(req)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  // ?documentais=1 força só a leitura das fontes documentais (INMET,
  // diários, RSS) e regrava o snapshot — sem gastar crédito da Apify. A
  // rotina delas é pegar carona no webhook; isto é o botão manual.
  if (url.searchParams.get("documentais") === "1") {
    if (!temToken() || !KV_STORE) {
      return NextResponse.json({ erro: "Apify não configurada (o snapshot vive no KV dela)" }, { status: 503 });
    }
    const d = await coletarDocumentais();
    const base = (await lerKV<Omit<Acervo, "origem">>(KV_STORE, CHAVE_ACERVO, true)) ?? undefined;
    const snapshot = montarAcervo({ novos: d.itens, base, saudeColeta: d.saude });
    await gravarKV(KV_STORE, CHAVE_ACERVO, snapshot);
    revalidateTag(ETIQUETA_ACERVO, { expire: 0 });
    for (const p of ["/", "/jornal", "/acervo", "/calendario", "/fontes"]) revalidatePath(p);
    return NextResponse.json({
      ok: true,
      documentais: d.itens.length,
      fontes: d.saude.map((s) => ({ fonte: s.fonte, ok: s.ok, itens: s.itens, detalhe: s.detalhe })),
      total: snapshot.totais.itens,
    });
  }

  if (!CADENCIAS.includes(cadencia)) {
    return NextResponse.json({ erro: `cadência inválida: ${cadencia}` }, { status: 400 });
  }
  if (!temToken()) {
    return NextResponse.json({ erro: "APIFY_TOKEN não configurado" }, { status: 503 });
  }

  const input = inputInstagram(cadencia);
  if (input.username.length === 0) {
    return NextResponse.json({ ok: true, cadencia, nota: "nenhuma conta nesta cadência" });
  }

  try {
    const run = await rodarActor(ACTOR_INSTAGRAM, input);
    return NextResponse.json({
      ok: true,
      cadencia,
      perfis: input.username.length,
      desde: input.onlyPostsNewerThan,
      runId: run.id,
      datasetId: run.defaultDatasetId,
    });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 502 });
  }
}

function autorizado(req: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  // Sem segredo configurado a rota fica aberta apenas fora de produção:
  // um endpoint que gasta crédito da Apify não pode ficar público por
  // esquecimento de configuração.
  if (!segredo) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${segredo}`;
}
