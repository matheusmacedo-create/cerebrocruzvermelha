import { NextResponse } from "next/server";
import { carregarAcervo, pontuar } from "@/dados/acervo";
import { resolverConta } from "@/core/contas";
import { planoDeCanais, proibicoes } from "@/core/canais";
import { direitoDe, podePublicar } from "@/core/direito";
import { MODO_ROTULO } from "@/core/mente";
import { VERSAO_CONTRATO } from "@/core/contrato";

export const dynamic = "force-dynamic";

/**
 * CONTRATO COM A REDAÇÃO.
 *
 * Esta é a fronteira do Cérebro. Ele entrega uma pauta com o dever de casa
 * feito — fato, fonte, nota, plano por canal e as proibições — e para aqui.
 * Quem produz, aprova e publica é a Redação, com decisão humana.
 *
 *   GET /api/pauta            → as pautas que passaram do corte
 *   GET /api/pauta?id=<id>    → uma pauta específica
 *   GET /api/pauta?modo=produzir&limite=10
 *
 * O formato é estável: mudanças aqui quebram a Redação, então versionamos
 * em src/core/contrato.ts.
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const modo = url.searchParams.get("modo");
  const limite = Math.min(Number(url.searchParams.get("limite") ?? 20) || 20, 100);

  const acervo = await carregarAcervo();
  let pontuados = pontuar(acervo.itens, { hoje: acervo.hoje });

  if (id) pontuados = pontuados.filter((p) => p.item.id === id);
  else if (modo) pontuados = pontuados.filter((p) => p.score.modo === modo);
  else pontuados = pontuados.filter((p) => ["agir_agora", "produzir", "agendar"].includes(p.score.modo));

  if (id && pontuados.length === 0) {
    return NextResponse.json({ erro: `sinal ${id} não encontrado` }, { status: 404 });
  }

  const pautas = pontuados.slice(0, limite).map(({ item, score }) => {
    const conta = resolverConta(item);
    const d = direitoDe(item);
    return {
      id: item.id,
      titulo: item.titulo,
      resumo: item.resumo,
      fato: {
        fonte: item.fonte,
        conta: conta?.instagram ?? conta?.x ?? null,
        url: item.url,
        quando: item.quando,
        plataforma: item.plataforma,
        confiavel: score.confianca >= 80,
      },
      decisao: {
        modo: score.modo,
        modoRotulo: MODO_ROTULO[score.modo],
        veredito: score.veredito,
        nota: score.total,
        notas: {
          localidade: score.localidade,
          urgencia: score.urgencia,
          relacao: score.relacao,
          acaoReal: score.acaoReal,
          ineditismo: score.ineditismo,
          confianca: score.confianca,
        },
        // A Redação recebe o raciocínio, não só a conclusão.
        porque: score.porque,
      },
      midia: item.midia
        ? {
            url: item.midia.url,
            formato: item.midia.formato,
            tipo: item.midia.tipo,
            direito: d,
            // A trava que atravessa o projeto, explícita no contrato.
            podePublicar: podePublicar(d),
            credito: item.midia.credito,
          }
        : null,
      canais: planoDeCanais(item, score),
      proibido: proibicoes(item),
    };
  });

  return NextResponse.json(
    {
      versao: VERSAO_CONTRATO,
      origem: acervo.origem,
      geradoEm: acervo.gerado_em,
      aviso:
        "O Cérebro recomenda; ele não publica. Mídia com podePublicar=false não pode entrar em peça da filial.",
      total: pautas.length,
      pautas,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
