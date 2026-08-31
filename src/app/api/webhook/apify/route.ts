import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ACTOR_INSTAGRAM, CHAVE_ACERVO, KV_STORE, gravarKV, lerDataset, lerKV, rodarActor, temToken } from "@/apify/cliente";
import { perfisBloqueados, postsParaItens, saudeDaColeta, type PostInstagram } from "@/apify/normalizar";
import { montarAcervo } from "@/dados/montar";
import { chavesGuardadas, guardarMidias, podarMidia } from "@/apify/midia";
import type { Acervo } from "@/core/tipos";

export const dynamic = "force-dynamic";

interface CorpoWebhook {
  eventType?: string;
  resource?: { id?: string; defaultDatasetId?: string; status?: string };
}

/**
 * Webhook da Apify: chamado quando uma run termina.
 *
 * Lê o dataset da run, normaliza os posts contra a lista fechada, mescla no
 * snapshot atual do Key-Value Store e revalida as telas.
 *
 * Configurar na Apify com o evento ACTOR.RUN.SUCCEEDED apontando para
 * POST /api/webhook/apify?segredo=<APIFY_WEBHOOK_SECRET>
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const segredo = process.env.APIFY_WEBHOOK_SECRET;
  if (segredo && url.searchParams.get("segredo") !== segredo) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!temToken() || !KV_STORE) {
    return NextResponse.json({ erro: "Apify não configurada" }, { status: 503 });
  }

  let corpo: CorpoWebhook;
  try {
    corpo = (await req.json()) as CorpoWebhook;
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const datasetId = corpo.resource?.defaultDatasetId;
  if (!datasetId) {
    return NextResponse.json({ erro: "webhook sem defaultDatasetId" }, { status: 400 });
  }

  try {
    const posts = await lerDataset<PostInstagram>(datasetId, 2000);
    // Posts de contas fora da lista fechada são descartados aqui.
    const novos = postsParaItens(posts);

    // `fresco`: acabamos de gravar e precisamos mesclar sobre o estado atual.
    const base = (await lerKV<Omit<Acervo, "origem">>(KV_STORE, CHAVE_ACERVO, true)) ?? undefined;
    // Perfis que falharam viram saúde de fonte visível na tela de Fontes.
    const snapshot = montarAcervo({ novos, base, saudeColeta: saudeDaColeta(posts) });
    await gravarKV(KV_STORE, CHAVE_ACERVO, snapshot);

    // As URLs da CDN expiram em dias: os bytes são copiados agora, enquanto
    // ainda respondem. Falha aqui não invalida a coleta — o sinal já entrou.
    const jaTem = await chavesGuardadas().catch(() => new Set<string>());
    const midia = await guardarMidias(
      snapshot.itens.filter((i) => novos.some((n) => n.id === i.id)),
      jaTem,
    ).catch(() => ({ guardadas: 0, falhas: 0, semMidia: 0, jaTinham: 0 }));
    const podadas = await podarMidia(new Set(snapshot.itens.map((i) => i.id))).catch(() => 0);

    for (const p of ["/", "/jornal", "/acervo", "/calendario", "/fontes"]) revalidatePath(p);

    // O Instagram bloqueia perfis de forma intermitente e o actor desiste na
    // primeira recusa — numa coleta diária, 7 de 8 perfis chegaram a falhar.
    // Perfil bloqueado não gera post, logo não é cobrado: retentar só custa o
    // que teríamos pago se não houvesse bloqueio. Uma vez só, e a run carrega
    // o marcador para não virar laço.
    const retentativa = url.searchParams.get("retry") === "1";
    const bloqueados = retentativa ? [] : perfisBloqueados(posts);
    if (bloqueados.length > 0) {
      const aviso = new URL(req.url);
      aviso.searchParams.set("retry", "1");
      await rodarActor(
        ACTOR_INSTAGRAM,
        { username: bloqueados, resultsLimit: 8, skipPinnedPosts: true, onlyPostsNewerThan: "2 days" },
        aviso.toString(),
      ).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      lidos: posts.length,
      aceitos: novos.length,
      descartados: posts.length - novos.length,
      falhas: saudeDaColeta(posts).filter((s) => !s.ok).length,
      total: snapshot.totais.itens,
      midia: { ...midia, podadas },
      retentando: bloqueados,
    });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 502 });
  }
}
