import { NextResponse } from "next/server";
import { carregarAcervo, pontuar } from "@/dados/acervo";
import { resolverConta } from "@/core/contas";
import { planoDeCanais, proibicoes } from "@/core/canais";
import { direitoDe, podePublicar } from "@/core/direito";
import { MODO_ROTULO } from "@/core/mente";
import { VERSAO_CONTRATO } from "@/core/contrato";
import { agrupar, diversificar } from "@/core/agrupar";
import { lerRecusas } from "@/dados/feedback";

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

  // A Redação consome isto de outro domínio: caminho relativo não resolveria
  // lá. A origem sai da própria requisição para não depender de configuração.
  const origem = `${url.protocol}//${url.host}`;

  // Quando há segredo configurado, o contrato deixa de ser público: o
  // raciocínio editorial da filial não precisa ficar aberto na internet.
  const segredo = process.env.PAUTA_TOKEN;
  if (segredo) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${segredo}`) {
      return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
    }
  }
  const id = url.searchParams.get("id");
  const modo = url.searchParams.get("modo");
  const limite = Math.min(Number(url.searchParams.get("limite") ?? 20) || 20, 100);

  const acervo = await carregarAcervo();
  // A Redação nunca deve receber pauta que a equipe já recusou aqui.
  const recusados = await lerRecusas();
  let pontuados = diversificar(agrupar(pontuar(acervo.itens, { hoje: acervo.hoje, recusados })));

  if (id) pontuados = pontuados.filter((p) => p.item.id === id);
  else if (modo) pontuados = pontuados.filter((p) => p.score.modo === modo);
  else pontuados = pontuados.filter((p) => ["agir_agora", "produzir", "agendar"].includes(p.score.modo));

  if (id && pontuados.length === 0) {
    return NextResponse.json({ erro: `sinal ${id} não encontrado` }, { status: 404 });
  }

  const pautas = pontuados.slice(0, limite).map(({ item, score, semelhantes, recolhidos }) => {
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
            // Servida pelo cache do Cérebro: a URL da CDN do Instagram expira
            // em dias e a Redação guardaria um link morto.
            url: `${origem}/api/midia/${item.id}`,
            urlOriginal: item.midia.url,
            formato: item.midia.formato,
            tipo: item.midia.tipo,
            direito: d,
            // A trava que atravessa o projeto, explícita no contrato.
            podePublicar: podePublicar(d),
            /*
             * Se a mídia é da própria filial. Material que a Casa publicou no
             * seu Instagram é dela, e tratar isso como "de terceiro" impediria
             * a filial de reaproveitar a própria foto — que não é a regra que
             * o Cérebro sustenta. Continua exigindo autorização humana antes
             * de publicar, mas por um motivo diferente: quem aparece na foto.
             */
            daCasa: conta?.vinculo === "casa",
            credito: item.midia.credito,
          }
        : null,
      // Boletins repetidos da mesma conta chegam agrupados, não como pautas soltas.
      agrupados: semelhantes === 0 ? null : {
        quantidade: semelhantes,
        outros: recolhidos.map((r) => ({ id: r.id, titulo: r.titulo, quando: r.quando, url: r.url })),
      },
      canais: planoDeCanais(item, score),
      proibido: proibicoes(item),
      // Link de volta para a triagem, para quem quiser ver o raciocínio inteiro.
      urlNoCerebro: `${origem}/jornal#${item.id}`,
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
