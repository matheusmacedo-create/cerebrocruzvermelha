import type { Item, Score } from "./tipos";
import { resolverConta } from "./contas";
import { normalizar } from "./lexico";

/**
 * O Cérebro agrupa.
 *
 * O COR-Rio publica "TEMPO AGORA | ..." de hora em hora; o INMET emite dezenas
 * de avisos por dia. Cada um pontua igual, e sozinhos eles ocupam a tela de
 * atenção inteira — que é justamente o ruído que este projeto existe para tirar
 * da frente de quem decide.
 *
 * Boletins da mesma conta e da mesma família viram um item só. O representante
 * é o de maior nota, então uma escalada de estágio continua aparecendo: o
 * boletim mais grave ganha do rotineiro por construção, não por exceção.
 */

export interface Agrupado {
  item: Item;
  score: Score;
  /** Quantos boletins semelhantes foram recolhidos neste. */
  semelhantes: number;
  /** Os recolhidos, do mais recente para o mais antigo. */
  recolhidos: Item[];
}

/**
 * Assinatura da família do boletim.
 *
 * Boletim gritado em caixa alta é gabarito: "TEMPO AGORA | ...",
 * "SEGUNDA-FEIRA (31/8) COM PREVISÃO DE ...". Notícia é escrita em caixa
 * normal: "Defesa Civil RJ realiza simulado ...". Essa diferença é o que
 * separa o que deve ser agrupado do que não deve — agrupar notícia distinta
 * esconderia fato, que é pior que repetir boletim.
 *
 * A assinatura são as duas primeiras palavras da abertura em caixa alta, sem
 * números. Duas e não três: "SEGUNDA-FEIRA COM POSSIBILIDADE" e "SEGUNDA-FEIRA
 * COM PREVISÃO" são o mesmo boletim de previsão e divergem só na terceira.
 * O escopo é sempre uma conta só, então duas palavras não colam famílias
 * de fontes diferentes.
 */
const MIN_PALAVRAS_CAIXA_ALTA = 2;

export function familia(item: Item): string | null {
  const conta = resolverConta(item);
  if (!conta) return null;

  const palavras = item.titulo.trim().split(/\s+/);
  const abertura: string[] = [];
  for (const p of palavras) {
    if (p === "|") break;
    const letras = p.replace(/[^\p{L}]/gu, "");
    // Palavra só de números ou pontuação — "(31/8)" — não quebra a sequência.
    if (letras.length === 0) continue;
    if (letras.length < 2 || letras !== letras.toLocaleUpperCase("pt-BR")) break;
    abertura.push(letras);
  }
  if (abertura.length < MIN_PALAVRAS_CAIXA_ALTA) return null;

  const chave = normalizar(abertura.slice(0, 2).join(" "));
  return `${conta.id}::${chave}`;
}

/** Recolhe boletins repetidos, preservando a ordem por nota. */
export function agrupar(pontuados: { item: Item; score: Score }[]): Agrupado[] {
  const familias = new Map<string, { item: Item; score: Score }[]>();
  const soltos: Agrupado[] = [];

  for (const p of pontuados) {
    const f = familia(p.item);
    if (!f) {
      soltos.push({ ...p, semelhantes: 0, recolhidos: [] });
      continue;
    }
    const atual = familias.get(f);
    if (atual) atual.push(p);
    else familias.set(f, [p]);
  }

  const agrupados: Agrupado[] = [];
  for (const membros of familias.values()) {
    if (membros.length === 1) {
      agrupados.push({ ...membros[0], semelhantes: 0, recolhidos: [] });
      continue;
    }
    // Maior nota representa; empate desempata pelo mais recente.
    const ordenados = [...membros].sort(
      (a, b) => b.score.total - a.score.total || +new Date(b.item.quando) - +new Date(a.item.quando),
    );
    const [chefe, ...resto] = ordenados;
    agrupados.push({
      item: chefe.item,
      score: {
        ...chefe.score,
        porque: [
          ...chefe.score.porque,
          `Mais ${resto.length} boletim(ns) semelhante(s) desta conta no período — o Cérebro agrupa em vez de repetir. Este é o de maior nota.`,
        ],
      },
      semelhantes: resto.length,
      recolhidos: resto.map((r) => r.item).sort((a, b) => +new Date(b.quando) - +new Date(a.quando)),
    });
  }

  return [...soltos, ...agrupados].sort((a, b) => b.score.total - a.score.total);
}
