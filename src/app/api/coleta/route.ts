import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { ACTOR_INSTAGRAM, CHAVE_ACERVO, ETIQUETA_ACERVO, KV_STORE, gravarKV, lerKV, rodarActor, temToken } from "@/apify/cliente";
import { inputInstagram, type Cadencia } from "@/apify/input";
import { coletarDocumentais } from "@/dados/documentais";
import { montarAcervo } from "@/dados/montar";
import type { Acervo } from "@/core/tipos";
import { autorizadoNaOperacao } from "../_lib/autorizacao";

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

  // Os webhooks fixos da Apify estão presos às Tasks agendadas; uma run
  // avulsa do actor não dispara nenhum deles. Sem avisar o nosso webhook a
  // run terminava, cobrava, e o resultado nunca entrava no acervo.
  const segredoDoWebhook = process.env.APIFY_WEBHOOK_SECRET?.trim();
  const avisarEm = segredoDoWebhook
    ? `${url.protocol}//${url.host}/api/webhook/apify?segredo=${encodeURIComponent(segredoDoWebhook)}`
    : undefined;

  try {
    const run = await rodarActor(ACTOR_INSTAGRAM, input, avisarEm);
    return NextResponse.json({
      ok: true,
      cadencia,
      perfis: input.username.length,
      desde: input.onlyPostsNewerThan,
      runId: run.id,
      datasetId: run.defaultDatasetId,
      ingestao: avisarEm
        ? "o webhook desta run grava o acervo quando ela terminar"
        : "SEM webhook: configure APIFY_WEBHOOK_SECRET ou o resultado não entra no acervo",
    });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 502 });
  }
}

const autorizado = autorizadoNaOperacao;
