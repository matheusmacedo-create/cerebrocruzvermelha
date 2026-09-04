import { NextResponse } from "next/server";
import { carregarAcervo } from "@/dados/acervo";
import { CONTAS } from "@/core/contas";
import { VERSAO_CONTRATO } from "@/core/contrato";
import { temToken, KV_STORE } from "@/apify/cliente";
import { autorizadoNaOperacao, contratoAberto } from "../_lib/autorizacao";

/** Quantos perfis o Instagram deixou passar, nas últimas coletas. */
function resumoBloqueio(registros: { quando: string; pedidos: number; responderam: number }[]) {
  if (registros.length === 0) return { coletas: 0, nota: "sem histórico ainda" };
  const ultimas = registros.slice(0, 20);
  const pedidos = ultimas.reduce((n, r) => n + r.pedidos, 0);
  const ok = ultimas.reduce((n, r) => n + r.responderam, 0);
  return {
    coletas: ultimas.length,
    perfisPedidos: pedidos,
    perfisQueResponderam: ok,
    taxaDeSucesso: pedidos ? `${Math.round((ok / pedidos) * 100)}%` : "—",
    ultima: ultimas[0],
  };
}

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

/** A coleta de rotina mais lenta roda a cada 6h; o dobro disso é atraso. */
const ATRASO_MAXIMO_H = 12;

export const dynamic = "force-dynamic";

/**
 * Diagnóstico rápido: de onde o Cérebro está lendo agora.
 *
 * O estado das variáveis (nome e tamanho, nunca o valor) só sai com o
 * CRON_SECRET no Bearer: é mapa da configuração de produção, e mapa não se
 * pendura na porta. O resto — origem, totais, avisos — é público e serve
 * para a Redação saber se o Cérebro está de pé.
 */
export async function GET(req: Request) {
  const acervo = await carregarAcervo(true);
  const operador = autorizadoNaOperacao(req);

  const horasDesdeAColeta = (Date.now() - Date.parse(acervo.gerado_em)) / 36e5;
  const avisos: string[] = [];
  if (contratoAberto()) {
    avisos.push("Contrato aberto: PAUTA_TOKEN não está configurado — /api/pauta e /api/feedback aceitam qualquer chamada. Defina o mesmo segredo aqui e em CEREBRO_TOKEN na Redação.");
  }
  if (!process.env.REDACAO_URL?.trim()) {
    avisos.push("Fase 2 desligada: sem REDACAO_URL o Cérebro não sabe o que a Casa já publicou nem o que o Registrar confirma.");
  }
  if (acervo.origem === "seed") {
    avisos.push("Lendo a semente do repositório, não a coleta viva.");
  } else if (Number.isFinite(horasDesdeAColeta) && horasDesdeAColeta > ATRASO_MAXIMO_H) {
    avisos.push(`Coleta atrasada: o último snapshot tem ${Math.round(horasDesdeAColeta)}h. Confira as Tasks e os webhooks na Apify.`);
  }
  const fontesFora = acervo.saude.filter((s) => !s.ok).map((s) => s.fonte);
  if (fontesFora.length >= 3) avisos.push(`${fontesFora.length} fontes documentais fora do ar na última coleta.`);

  return NextResponse.json({
    ok: true,
    origem: acervo.origem,
    contrato: { versao: VERSAO_CONTRATO, aberto: contratoAberto() },
    redacao: { configurada: Boolean(process.env.REDACAO_URL?.trim()), comToken: Boolean(process.env.REDACAO_CONTEXTO_TOKEN?.trim()) },
    apify: { token: temToken(), kvStore: Boolean(KV_STORE), webhookComSegredo: Boolean(process.env.APIFY_WEBHOOK_SECRET?.trim()) },
    avisos,
    ...(operador
      ? {
          variaveis: Object.fromEntries(
            [
              "APIFY_TOKEN", "APIFY_KV_STORE", "APIFY_ACTOR_INSTAGRAM", "APIFY_WEBHOOK_SECRET", "CRON_SECRET",
              "PAUTA_TOKEN", "REDACAO_URL", "REDACAO_CONTEXTO_TOKEN",
            ].map((n) => [n, estadoDaVar(n)]),
          ),
        }
      : { variaveis: "só com Authorization: Bearer <CRON_SECRET>" }),
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    contas: CONTAS.length,
    hoje: acervo.hoje,
    geradoEm: acervo.gerado_em,
    horasDesdeAColeta: Number.isFinite(horasDesdeAColeta) ? Math.round(horasDesdeAColeta * 10) / 10 : null,
    totais: acervo.totais,
    fontesFora,
    // Taxa de bloqueio do Instagram nas últimas coletas. É o número que diz
    // se vale mudar cadência ou trocar de actor — não a impressão da última run.
    bloqueio: resumoBloqueio(acervo.bloqueio ?? []),
  });
}
