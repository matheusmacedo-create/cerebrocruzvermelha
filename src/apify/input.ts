import { CONTAS, perfisInstagram } from "@/core/contas";
import type { Conta } from "@/core/tipos";

/**
 * Inputs dos actors da Apify, gerados a partir da lista fechada.
 *
 * A lista de perfis nunca é digitada à mão num painel: ela sai de
 * `src/core/contas.ts`. Alterar a lista é alterar o código, com revisão.
 */

/**
 * Janela de coleta por cadência.
 *
 * Expressa em data relativa, no formato que o actor entende. Absoluta não
 * serve: o input fica guardado dentro da Task agendada na Apify e uma data
 * fixa envelhece — em uma semana a task estaria pedindo a semana errada.
 *
 * A janela é bem mais larga que o intervalo entre as runs, e isso importa
 * mais do que parecia. Uma janela apertada faz o actor devolver "vazio" para
 * uma conta perfeitamente saudável que só não postou hoje — medido: @hemorio
 * voltou vazio numa janela de 2 dias porque seu último post era de 2 dias
 * atrás, e numa de 30 dias trouxe 3 posts. Órgão público não publica todo dia.
 *
 * A deduplicação por id impede que a janela larga traga o mesmo post de novo,
 * e o teto por perfil segura o custo. Então larga custa pouco e apertada custa
 * fonte.
 */
export const JANELA: Record<Conta["cadencia"], { rotulo: string; apify: string }> = {
  tempo_real: { rotulo: "2 dias", apify: "2 days" },
  diario: { rotulo: "7 dias", apify: "7 days" },
  "3_dias": { rotulo: "14 dias", apify: "14 days" },
  "10_dias": { rotulo: "30 dias", apify: "30 days" },
};

export type Cadencia = Conta["cadencia"];

/** Actor: apify/instagram-post-scraper */
export interface InputInstagram {
  username: string[];
  resultsLimit: number;
  onlyPostsNewerThan?: string;
  skipPinnedPosts: boolean;
}

export function inputInstagram(cadencia: Cadencia): InputInstagram {
  const perfis = perfisInstagram((c) => c.cadencia === cadencia);
  return {
    username: perfis,
    // Teto por perfil. Segura o custo e evita puxar arquivo antigo.
    resultsLimit: cadencia === "tempo_real" ? 12 : 8,
    // Filtro de data no lado da Apify: peça velha nem chega ao Cérebro,
    // e o que não vem não é cobrado.
    onlyPostsNewerThan: JANELA[cadencia].apify,
    // Post fixado é institucional antigo. Não é sinal.
    skipPinnedPosts: true,
  };
}

export const CADENCIAS: Cadencia[] = ["tempo_real", "diario", "3_dias", "10_dias"];

/** Um input por cadência — cada um vira uma Task agendada na Apify. */
export function todosOsInputsInstagram(): Record<Cadencia, InputInstagram> {
  return Object.fromEntries(CADENCIAS.map((c) => [c, inputInstagram(c)])) as Record<Cadencia, InputInstagram>;
}

/**
 * Agenda de cada cadência, em cron. Roda na Apify, não na Vercel.
 *
 * A coleta é responsabilidade da Apify: agendar lá tira a dependência do cron
 * da Vercel — que o plano Hobby limita — e deixa o app só recebendo o webhook.
 */
export const AGENDA: Record<Cadencia, { cron: string; descricao: string }> = {
  tempo_real: { cron: "0 */6 * * *", descricao: "a cada 6 horas" },
  diario: { cron: "20 9 * * *", descricao: "todo dia às 9h20" },
  // Espalhadas pelo dia de propósito: coletas encostadas viram uma rajada
  // de runs, e é a rajada que o Instagram bloqueia.
  "3_dias": { cron: "40 14 */3 * *", descricao: "a cada 3 dias, às 14h40" },
  "10_dias": { cron: "0 19 1,11,21 * *", descricao: "nos dias 1, 11 e 21, às 19h" },
};

/** Fuso das agendas. Boletim de chuva do Rio é lido em horário do Rio. */
export const FUSO = "America/Sao_Paulo";

/**
 * Quantos perfis por run.
 *
 * O Instagram bloqueia, e a pergunta é o que dispara o bloqueio. Medido na
 * operação: a primeira coleta do dia acertou 12 de 23 perfis; as seguintes,
 * na mesma hora, caíram para 1 de 8. Testei a hipótese de que o tamanho do
 * lote era a causa — um lote de 3 perfis voltou 0 de 3. Não é o tamanho.
 *
 * O que resta é o número de runs na janela: mais lotes significam mais runs,
 * e mais runs significam mais bloqueio. Então o teto é alto de propósito —
 * cada cadência cabe em uma run só. O valor fica aqui, num lugar só, para
 * ser ajustado quando houver uma semana de dados em vez de palpite.
 */
export const PERFIS_POR_LOTE = 8;

/** Minutos de espaçamento entre lotes da mesma cadência. */
export const ESPACO_MINUTOS = 17;

export interface Lote {
  cadencia: Cadencia;
  indice: number;
  nome: string;
  input: InputInstagram;
  cron: string;
  descricao: string;
}

/** Divide uma cadência em lotes escalonados, cada um com sua agenda. */
export function lotesDe(cadencia: Cadencia): Lote[] {
  const base = inputInstagram(cadencia);
  const lotes: Lote[] = [];
  for (let i = 0; i * PERFIS_POR_LOTE < base.username.length; i++) {
    const perfis = base.username.slice(i * PERFIS_POR_LOTE, (i + 1) * PERFIS_POR_LOTE);
    const { cron, descricao } = escalonar(AGENDA[cadencia].cron, i, AGENDA[cadencia].descricao);
    lotes.push({
      cadencia,
      indice: i,
      nome: `cerebro-cvrj-${cadencia.replace(/_/g, "-")}-${i + 1}`,
      input: { ...base, username: perfis },
      cron,
      descricao,
    });
  }
  return lotes;
}

/** Empurra o minuto do cron, mantendo o resto da expressão. */
function escalonar(cron: string, indice: number, descricao: string): { cron: string; descricao: string } {
  if (indice === 0) return { cron, descricao };
  const campos = cron.split(" ");
  const minuto = Number(campos[0]);
  if (Number.isNaN(minuto)) return { cron, descricao: `${descricao} (lote ${indice + 1})` };
  const novo = (minuto + indice * ESPACO_MINUTOS) % 60;
  // Passar da hora exigiria mexer no campo da hora; espaçamento cabe em 60min.
  campos[0] = String(novo);
  return { cron: campos.join(" "), descricao: `${descricao}, lote ${indice + 1} aos ${novo} min` };
}

/** Todos os lotes de todas as cadências. */
export function todosOsLotes(): Lote[] {
  return CADENCIAS.flatMap(lotesDe);
}

/** Resumo legível da lista, para conferência humana antes de rodar. */
export function resumoDaLista(): string {
  const linhas = CONTAS.map(
    (c) => `${c.cadencia.padEnd(10)} ${(c.instagram ?? "—").padEnd(28)} ${(c.x ?? "—").padEnd(20)} ${c.nome}`,
  );
  return [`${CONTAS.length} contas na lista fechada`, "", ...linhas].join("\n");
}
