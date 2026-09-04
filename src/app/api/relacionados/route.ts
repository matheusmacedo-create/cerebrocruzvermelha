import { NextResponse } from "next/server";
import { carregarAcervo, pontuar } from "@/dados/acervo";
import { resolverConta } from "@/core/contas";
import { ehSinal, MODO_ROTULO } from "@/core/mente";
import { normalizar } from "@/core/lexico";
import { lerAceites, lerRecusas } from "@/dados/feedback";
import { lerContextoDaRedacao } from "@/dados/redacao";
import { autorizadoNoContrato } from "../_lib/autorizacao";

export const dynamic = "force-dynamic";

/**
 * O mesmo assunto, sob demanda.
 *
 * A Redação pede isto quando alguém abre uma pauta e quer contexto: outros
 * sinais do acervo que encostam no mesmo assunto — mesma conta, mesmo eixo,
 * palavras do título em comum — com a capa servida pelo nosso cache. É uma
 * consulta cara de tela, então ela nunca roda junto do mural: só quando o
 * humano clica "Explorar o assunto".
 *
 *   GET /api/relacionados?id=<sinal>&limite=10
 *
 * Mesma regra de acesso do contrato: com PAUTA_TOKEN configurado, Bearer.
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origem = `${url.protocol}//${url.host}`;

  if (!autorizadoNoContrato(req)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "faltou o id do sinal" }, { status: 400 });
  const limite = Math.min(Number(url.searchParams.get("limite") ?? 10) || 10, 20);
  // A Redação pode mandar os termos que a IA dela extraiu (?q=...): a busca
  // interna então usa as MESMAS palavras da busca na imprensa, e as duas
  // metades do painel contam a mesma história.
  const q = url.searchParams.get("q")?.trim() || null;

  const [acervo, recusados, aceites, daRedacao] = await Promise.all([
    carregarAcervo(),
    lerRecusas(),
    lerAceites(),
    lerContextoDaRedacao(),
  ]);

  const pontuados = pontuar(
    acervo.itens.filter((i) => ehSinal(i)),
    { hoje: acervo.hoje, recusados, aceites, ...daRedacao },
  );
  const alvo = pontuados.find((p) => p.item.id === id);
  if (!alvo) return NextResponse.json({ erro: `sinal ${id} não encontrado` }, { status: 404 });

  const contaAlvo = resolverConta(alvo.item)?.id;
  const eixoAlvo = alvo.score.eixo;
  // As chaves saem dos termos da Redação quando vierem; senão, do título e
  // do começo do resumo do próprio sinal.
  const chaves = q
    ? palavras(q)
    : palavras(`${alvo.item.titulo} ${(alvo.item.resumo ?? "").slice(0, 240)}`);

  const candidatos = pontuados
    .filter((p) => p.item.id !== id)
    .map((p) => {
      const conta = resolverConta(p.item)?.id;
      const eixo = p.score.eixo;
      const texto = `${p.item.titulo} ${(p.item.resumo ?? "").slice(0, 240)}`;
      const doCandidato = palavras(texto);
      const comuns = [...doCandidato].filter((w) => chaves.has(w)).length;
      // Palavra em comum é obrigatória: eixo e conta são desempate, nunca
      // porta de entrada — foi assim que "saúde mental na Maré" trouxe
      // congelamento de leite materno para o painel.
      const afinidade =
        Math.min(4, comuns) * 3 +
        (eixo && eixo === eixoAlvo ? 1 : 0) +
        (conta && conta === contaAlvo ? 1 : 0) +
        (p.item.midia ? 1 : 0);
      return { p, comuns, afinidade };
    })
    // Com muitas chaves, uma palavra solta em comum é coincidência, não
    // assunto: o piso sobe junto com o vocabulário disponível.
    .filter((c) => c.comuns >= (chaves.size >= 8 ? 2 : 1))
    .sort(
      (a, b) =>
        b.afinidade - a.afinidade ||
        (Date.parse(b.p.item.quando) || 0) - (Date.parse(a.p.item.quando) || 0),
    );

  // A mesma matéria chega por mais de um feed com ids diferentes; título
  // repetido no painel é eco, não contexto.
  const vistos = new Set<string>();
  const unicos = candidatos
    .filter(({ p }) => {
      const chave = normalizar(p.item.titulo).slice(0, 70);
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    })
    .slice(0, limite);

  return NextResponse.json(
    {
      alvo: { id: alvo.item.id, titulo: alvo.item.titulo },
      palavras: [...chaves],
      relacionados: unicos.map(({ p }) => {
        const conta = resolverConta(p.item);
        return {
          id: p.item.id,
          titulo: p.item.titulo,
          fonte: p.item.fonte,
          conta: conta?.instagram ?? conta?.x ?? null,
          quando: p.item.quando,
          url: p.item.url,
          modo: p.score.modo,
          modoRotulo: MODO_ROTULO[p.score.modo],
          nota: p.score.total,
          // A capa sai do nosso cache: a URL da CDN da fonte expira em dias.
          midia: p.item.midia ? `${origem}/api/midia/${p.item.id}` : null,
        };
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Palavras vazias do português: sobreviver ao filtro de tamanho não faz de
 * "quando", "porque" e "também" assunto — foi por elas que o painel de
 * relacionados juntava posts que não dividiam nada além de gramática.
 */
const VAZIAS = new Set([
  "sobre", "quando", "porque", "ainda", "também", "tambem", "muito", "muita", "todos", "todas",
  "outro", "outra", "outros", "outras", "entre", "desde", "depois", "antes", "durante", "contra",
  "aquele", "aquela", "aqueles", "aquelas", "estas", "estes", "dessa", "desse", "nessa", "nesse",
  "desta", "deste", "nesta", "neste", "pelas", "pelos", "umas", "seus", "suas", "vocês", "voces",
  "gente", "coisa", "coisas", "fazer", "feito", "feita", "tenha", "temos", "estão", "estao",
  "sendo", "foram", "seria", "serão", "serao", "vamos", "poder", "podem", "confira", "saiba",
  "veja", "acesse", "clique", "hoje", "amanhã", "amanha", "semana", "sexta", "sábado", "sabado",
  "domingo", "segunda", "terça", "terca", "quarta", "quinta", "feira", "nesta", "neste", "junto",
  "agora", "nosso", "nossa", "nossos", "nossas", "baixe", "baixar", "publica", "publico",
  "publicas", "publicos", "completa", "completo", "ultima", "ultimo", "proxima", "proximo",
  "realizamos", "realizou", "realiza", "atraves", "partir", "conheca", "confere", "corre",
]);

/** Palavras com conteúdo do texto, para medir assunto em comum. */
function palavras(texto: string): Set<string> {
  return new Set(
    normalizar(texto)
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4 && !VAZIAS.has(w)),
  );
}
