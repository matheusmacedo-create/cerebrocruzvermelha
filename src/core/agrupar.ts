import type { Item, Score } from "./tipos";
import { resolverConta } from "./contas";
import { gabaritoOperacional, normalizar } from "./lexico";

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

/**
 * O gabarito muda de manchete todo dia — "SEGUNDA-FEIRA (31/8) COM…",
 * "TERÇA (1/9) COMEÇA…" — e a assinatura não pode mudar junto. Dia da
 * semana, período do dia e palavra de ligação saem antes de assinar.
 */
const PALAVRAS_DE_CALENDARIO = new Set([
  "segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo", "feira",
  "noite", "manha", "tarde", "madrugada", "hoje", "amanha", "fim", "semana",
  "de", "da", "do", "das", "dos", "com", "e", "no", "na", "nos", "nas", "em",
]);

/** O que basta para assinar: título e de onde veio. Recusas e aceites guardam só isso. */
export type Assinavel = Pick<Item, "titulo" | "contaId" | "fonte">;

export function familia(item: Assinavel): string | null {
  const conta = resolverConta(item);
  if (!conta) return null;

  // Boletim de serviço agrupa pelo serviço, não pela manchete: "TEMPO
  // AGORA", "NOITE DE TERÇA COM PANCADAS" e "BOLETIM DE VENTOS" são o mesmo
  // gabarito de tempo; "ATUALIZAÇÃO | FAIXA LIBERADA" e "TÚNEL REBOUÇAS |
  // ACIDENTE" são o mesmo gabarito de trânsito. O representante segue sendo
  // o de maior nota, então uma escalada continua aparecendo.
  const gabarito = gabaritoOperacional(item.titulo);
  if (gabarito) return `${conta.id}::${gabarito}`;

  const palavras = item.titulo.trim().split(/\s+/);
  const abertura: string[] = [];
  for (const p of palavras) {
    if (p === "|") break;
    // O ordinal de "(1º/9)" é letra para o Unicode, mas é data, não palavra.
    const letras = p.replace(/[ºª]/gu, "").replace(/[^\p{L}]/gu, "");
    // Palavra só de números ou pontuação — "(31/8)" — não quebra a sequência.
    if (letras.length === 0) continue;
    if (letras.length < 2 || letras !== letras.toLocaleUpperCase("pt-BR")) break;
    abertura.push(letras);
  }
  if (abertura.length < MIN_PALAVRAS_CAIXA_ALTA) return null;

  const significativas = abertura
    .map((p) => normalizar(p))
    .filter((p) => !PALAVRAS_DE_CALENDARIO.has(p));
  const chave = (significativas.length >= 2 ? significativas : abertura.map((p) => normalizar(p)))
    .slice(0, 2)
    .join(" ");
  return `${conta.id}::${chave}`;
}

/**
 * Assinatura da notícia em si, independente de por onde ela chegou.
 *
 * A mesma nota da Defesa Civil chega pelo RSS institucional e pelo Instagram
 * da conta. São ids diferentes, então a deduplicação por id não pega, e a
 * tela mostra o mesmo fato duas vezes — parte do que faz o dia parecer
 * repetitivo mesmo quando não é.
 */
export function mesmaNoticia(item: Assinavel): string | null {
  // Os dígitos ficam: "Estágio 2" e "Estágio 3" são notícias diferentes, e
  // "edição 130" não é "edição 131".
  const chave = normalizar(item.titulo)
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70);
  return chave.length >= 25 ? `noticia::${chave}` : null;
}

/**
 * A assinatura que o motor usa para lembrar: família do boletim quando há,
 * senão a notícia em si. É por ela que uma recusa em "TEMPO AGORA" alcança o
 * "TEMPO AGORA" de amanhã e não alcança o Estágio 5.
 */
export function assinatura(item: Assinavel): string | null {
  return familia(item) ?? mesmaNoticia(item);
}

/** Recolhe boletins repetidos, preservando a ordem por nota. */
export function agrupar(pontuados: { item: Item; score: Score }[]): Agrupado[] {
  const familias = new Map<string, { item: Item; score: Score }[]>();
  const soltos: Agrupado[] = [];

  for (const p of pontuados) {
    const f = familia(p.item) ?? mesmaNoticia(p.item);
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
    // Maior nota representa; empate desempata pelo mais recente e, por fim,
    // pelo id — sem o último critério o chefe oscilava entre duas leituras e
    // a Redação não reencontrava a pauta que acabara de abrir.
    const ordenados = [...membros].sort(
      (a, b) =>
        b.score.total - a.score.total ||
        (Date.parse(b.item.quando) || 0) - (Date.parse(a.item.quando) || 0) ||
        a.item.id.localeCompare(b.item.id),
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
      recolhidos: resto.map((r) => r.item).sort((a, b) => (Date.parse(b.quando) || 0) - (Date.parse(a.quando) || 0)),
    });
  }

  return [...soltos, ...agrupados].sort((a, b) => b.score.total - a.score.total || a.item.id.localeCompare(b.item.id));
}

/**
 * Diversidade na tela de atenção.
 *
 * O agrupamento resolve boletim repetido do mesmo gabarito, mas não resolve
 * uma conta que publicou três notícias distintas e boas: elas são diferentes
 * entre si e ocupam a tela inteira, enquanto fontes com um sinal só ficam
 * invisíveis. Quem abre precisa ver a variedade do dia, não o ranking de
 * quem postou mais.
 *
 * Só o que está abaixo de `minimoNota` cede a vaga: uma terceira notícia
 * boa da mesma conta continua no lugar que a nota lhe dá — rebaixá-la para
 * depois de itens de 32 era esconder pauta, não dar variedade.
 */
export function diversificar(lista: Agrupado[], porFonte = 2, minimoNota = 55): Agrupado[] {
  const contagem = new Map<string, number>();
  const escolhidos: Agrupado[] = [];
  const sobra: Agrupado[] = [];

  for (const a of lista) {
    const chave = resolverConta(a.item)?.id ?? a.item.fonte;
    const n = contagem.get(chave) ?? 0;
    if (n < porFonte || a.score.total >= minimoNota) {
      contagem.set(chave, n + 1);
      escolhidos.push(a);
    } else {
      sobra.push(a);
    }
  }
  // A sobra volta no fim: se houver poucas fontes no dia, a tela não fica vazia.
  return [...escolhidos, ...sobra];
}
