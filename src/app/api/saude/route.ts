import { NextResponse } from "next/server";
import { carregarAcervo } from "@/dados/acervo";
import { CONTAS } from "@/core/contas";
import { temToken, KV_STORE } from "@/apify/cliente";

/**
 * Estado de uma variável de ambiente, sem revelar o valor.
 *
 * Distinguir "ausente" de "presente mas vazia" é o que faz esta rota servir
 * para diagnóstico: as duas quebram o app do mesmo jeito e se consertam de
 * formas diferentes — uma é redeploy, a outra é o valor colado errado.
 * O tamanho basta para conferir se um token foi colado inteiro.
 */
function estadoDaVar(nome: string) {
  const v = process.env[nome];
  if (v === undefined) return { estado: "ausente" as const };
  const limpo = v.trim();
  if (limpo.length === 0) return { estado: "vazia" as const };
  if (limpo.length !== v.length) return { estado: "com espaços em volta" as const, caracteres: v.length };
  return { estado: "ok" as const, caracteres: v.length };
}

export const dynamic = "force-dynamic";

/** Diagnóstico rápido: de onde o Cérebro está lendo agora. */
export async function GET() {
  const acervo = await carregarAcervo();
  return NextResponse.json({
    ok: true,
    origem: acervo.origem,
    apify: { token: temToken(), kvStore: Boolean(KV_STORE) },
    variaveis: Object.fromEntries(
      ["APIFY_TOKEN", "APIFY_KV_STORE", "APIFY_ACTOR_INSTAGRAM", "APIFY_WEBHOOK_SECRET", "CRON_SECRET"].map(
        (n) => [n, estadoDaVar(n)],
      ),
    ),
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    contas: CONTAS.length,
    coleta: acervo.hoje,
    geradoEm: acervo.gerado_em,
    totais: acervo.totais,
    fontesFora: acervo.saude.filter((s) => !s.ok).map((s) => s.fonte),
  });
}
