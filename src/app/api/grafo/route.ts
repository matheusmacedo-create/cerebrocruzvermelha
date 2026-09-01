import { NextResponse } from "next/server";
import type { Eixo, Score } from "@/core/tipos";
import { EIXOS } from "@/core/tipos";
import { carregarAcervo, pontuar } from "@/dados/acervo";
import { CONTAS, SOMENTE_INTERNO, resolverConta } from "@/core/contas";
import { agrupar } from "@/core/agrupar";
import { MODO_ROTULO, ehSinal } from "@/core/mente";
import { lerRecusas } from "@/dados/feedback";
import { lerContextoDaRedacao } from "@/dados/redacao";

export const dynamic = "force-dynamic";

/**
 * O grafo do Cérebro — tudo o que ele sabe, como nós e ligações.
 *
 * A Redação desenha isto como um mapa estilo Obsidian: os cinco eixos como
 * polos, as contas e fontes ligadas aos sinais que produziram, os sinais
 * ligados ao eixo em que o motor os encaixou, e o calendário com as
 * propostas penduradas nas datas. Nenhuma aresta é inventada: cada uma sai
 * de um dado que o motor já usa para decidir.
 *
 * O contrato segue a regra do /api/pauta: com PAUTA_TOKEN configurado, só
 * entra quem apresenta o Bearer.
 */

interface No {
  id: string;
  tipo: "eixo" | "conta" | "fonte" | "sinal" | "data" | "proposta";
  rotulo: string;
  /** Campos por tipo; opcionais para o JSON ficar enxuto. */
  categoria?: string;
  vinculo?: string;
  interna?: boolean;
  nota?: number;
  modo?: string;
  modoRotulo?: string;
  quando?: string;
  url?: string;
  agrupados?: number;
  recusado?: string;
  dias?: number;
}

interface Aresta {
  de: string;
  para: string;
  /** publicou: fonte→sinal · encosta: sinal→eixo · cobre: conta→eixo ·
   *  marca: data→eixo · sugere: proposta→data|eixo */
  tipo: "publicou" | "encosta" | "cobre" | "marca" | "sugere";
}

const TETO_ROTULO = 90;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origem = `${url.protocol}//${url.host}`;

  const segredo = process.env.PAUTA_TOKEN;
  if (segredo && req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const [acervo, recusados, daRedacao] = await Promise.all([
    carregarAcervo(),
    lerRecusas(),
    lerContextoDaRedacao(),
  ]);

  const nos: No[] = [];
  const arestas: Aresta[] = [];
  const ids = new Set<string>();
  const no = (n: No) => {
    if (!ids.has(n.id)) {
      ids.add(n.id);
      nos.push(n);
    }
  };
  // Duas entradas do calendário no mesmo dia ligariam a mesma data ao mesmo
  // eixo duas vezes; aresta repetida só engrossa linha sem dizer nada novo.
  const vistas = new Set<string>();
  const liga = (de: string, para: string, tipo: Aresta["tipo"]) => {
    const chave = `${de}→${para}:${tipo}`;
    if (ids.has(de) && ids.has(para) && !vistas.has(chave)) {
      vistas.add(chave);
      arestas.push({ de, para, tipo });
    }
  };

  // Os cinco eixos são os polos do mapa.
  for (const [eixo, rotulo] of Object.entries(EIXOS)) {
    no({ id: `eixo:${eixo}`, tipo: "eixo", rotulo });
  }

  // A lista fechada inteira, mesmo quem não produziu sinal na janela:
  // fonte silenciosa visível é decisão do projeto, não acidente do grafo.
  for (const c of CONTAS) {
    no({
      id: `conta:${c.id}`,
      tipo: "conta",
      rotulo: c.nome,
      categoria: c.categoria,
      vinculo: c.vinculo,
      interna: SOMENTE_INTERNO.has(c.id) || undefined,
    });
    for (const e of c.eixos) liga(`conta:${c.id}`, `eixo:${e}`, "cobre");
  }

  // Sinais: pontuados com o mesmo contexto das telas, agrupados como no
  // Jornal — boletim de hora em hora vira um nó só, com o peso da família.
  const recusaPorId = new Map(recusados.map((r) => [r.id, r.motivo]));
  const sinais = agrupar(
    pontuar(
      acervo.itens.filter((i) => ehSinal(i)),
      { hoje: acervo.hoje, recusados, ...daRedacao },
    ),
  );

  for (const { item, score, semelhantes } of sinais) {
    const s = score as Score & { eixo?: Eixo };
    const idSinal = `sinal:${item.id}`;
    no({
      id: idSinal,
      tipo: "sinal",
      rotulo: cortar(item.titulo, TETO_ROTULO),
      nota: score.total,
      modo: score.modo,
      modoRotulo: MODO_ROTULO[score.modo],
      quando: item.quando,
      url: `${origem}/jornal#${item.id}`,
      agrupados: semelhantes || undefined,
      recusado: recusaPorId.get(item.id),
    });

    // Quem publicou: conta da lista fechada, ou a fonte documental como nó
    // próprio — sinal órfão no mapa mentiria que ele surgiu do nada.
    const conta = resolverConta(item);
    if (conta) {
      liga(`conta:${conta.id}`, idSinal, "publicou");
    } else {
      const idFonte = `fonte:${item.fonte}`;
      no({ id: idFonte, tipo: "fonte", rotulo: item.fonte });
      liga(idFonte, idSinal, "publicou");
    }

    // O eixo em que o motor encaixou o sinal. Abaixo de 25 o próprio motor
    // diz "não encosta em nenhum eixo" — ligar seria inventar relação.
    if (s.eixo && score.relacao >= 25) liga(idSinal, `eixo:${s.eixo}`, "encosta");
  }

  // Calendário: só o que ainda está pela frente. Data passada é memória do
  // Acervo, não ligação viva do mapa.
  for (const d of acervo.calendario) {
    if (d.dias < 0) continue;
    no({
      id: `data:${d.data}`,
      tipo: "data",
      rotulo: d.titulo,
      quando: d.data,
      dias: d.dias,
      url: d.url || undefined,
    });
    if (d.eixo in EIXOS) liga(`data:${d.data}`, `eixo:${d.eixo}`, "marca");
  }

  for (const p of acervo.propostas) {
    no({
      id: `proposta:${p.id}`,
      tipo: "proposta",
      rotulo: cortar(p.titulo, TETO_ROTULO),
      modo: p.modo,
      modoRotulo: MODO_ROTULO[p.modo],
      dias: p.dias,
    });
    liga(`proposta:${p.id}`, `eixo:${p.eixo}`, "sugere");
    liga(`proposta:${p.id}`, `data:${p.data}`, "sugere");
  }

  return NextResponse.json(
    {
      versao: "1.0",
      origem: acervo.origem,
      geradoEm: acervo.gerado_em,
      totais: { nos: nos.length, arestas: arestas.length },
      nos,
      arestas,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function cortar(texto: string, teto: number): string {
  const limpo = texto.trim();
  if (limpo.length <= teto) return limpo;
  const corte = limpo.slice(0, teto + 1);
  const espaco = corte.lastIndexOf(" ");
  return `${espaco > teto * 0.5 ? corte.slice(0, espaco) : corte.slice(0, teto)}…`;
}
