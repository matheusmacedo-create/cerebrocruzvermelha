import { NextResponse } from "next/server";
import type { Eixo, Score } from "@/core/tipos";
import { carregarAcervo, pontuar } from "@/dados/acervo";
import { resolverConta } from "@/core/contas";
import { ehSinal, MODO_ROTULO } from "@/core/mente";
import { normalizar } from "@/core/lexico";
import { lerRecusas } from "@/dados/feedback";
import { lerContextoDaRedacao } from "@/dados/redacao";

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

  const segredo = process.env.PAUTA_TOKEN;
  if (segredo && req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "faltou o id do sinal" }, { status: 400 });
  const limite = Math.min(Number(url.searchParams.get("limite") ?? 10) || 10, 20);

  const [acervo, recusados, daRedacao] = await Promise.all([
    carregarAcervo(),
    lerRecusas(),
    lerContextoDaRedacao(),
  ]);

  const pontuados = pontuar(
    acervo.itens.filter((i) => ehSinal(i)),
    { hoje: acervo.hoje, recusados, ...daRedacao },
  );
  const alvo = pontuados.find((p) => p.item.id === id);
  if (!alvo) return NextResponse.json({ erro: `sinal ${id} não encontrado` }, { status: 404 });

  const contaAlvo = resolverConta(alvo.item)?.id;
  const eixoAlvo = (alvo.score as Score & { eixo?: Eixo }).eixo;
  const chaves = palavras(alvo.item.titulo);

  const candidatos = pontuados
    .filter((p) => p.item.id !== id)
    .map((p) => {
      const conta = resolverConta(p.item)?.id;
      const eixo = (p.score as Score & { eixo?: Eixo }).eixo;
      const comuns = [...palavras(p.item.titulo)].filter((w) => chaves.has(w)).length;
      // Afinidade: assunto pesa mais que origem, e capa desempata — quem
      // explora quer VER o assunto, não só ler mais títulos.
      const afinidade =
        Math.min(4, comuns) * 2 +
        (eixo && eixo === eixoAlvo ? 2 : 0) +
        (conta && conta === contaAlvo ? 1 : 0) +
        (p.item.midia ? 1 : 0);
      return { p, afinidade };
    })
    .filter((c) => c.afinidade >= 2)
    .sort(
      (a, b) =>
        b.afinidade - a.afinidade ||
        (Date.parse(b.p.item.quando) || 0) - (Date.parse(a.p.item.quando) || 0),
    )
    .slice(0, limite);

  return NextResponse.json(
    {
      alvo: { id: alvo.item.id, titulo: alvo.item.titulo },
      relacionados: candidatos.map(({ p }) => {
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

/** Palavras com conteúdo do título, para medir assunto em comum. */
function palavras(titulo: string): Set<string> {
  return new Set(
    normalizar(titulo)
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4),
  );
}
