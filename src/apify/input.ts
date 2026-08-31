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
 * A janela é mais larga que o intervalo entre as runs de propósito. Se uma
 * run falhar, a seguinte ainda alcança o que a anterior perdeu, e a
 * deduplicação por id impede que o mesmo post entre duas vezes.
 */
export const JANELA: Record<Conta["cadencia"], { rotulo: string; apify: string }> = {
  tempo_real: { rotulo: "1 dia", apify: "1 days" },
  diario: { rotulo: "2 dias", apify: "2 days" },
  "3_dias": { rotulo: "4 dias", apify: "4 days" },
  "10_dias": { rotulo: "11 dias", apify: "11 days" },
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
  "3_dias": { cron: "40 9 */3 * *", descricao: "a cada 3 dias, às 9h40" },
  "10_dias": { cron: "0 10 1,11,21 * *", descricao: "nos dias 1, 11 e 21, às 10h" },
};

/** Fuso das agendas. Boletim de chuva do Rio é lido em horário do Rio. */
export const FUSO = "America/Sao_Paulo";

/** Resumo legível da lista, para conferência humana antes de rodar. */
export function resumoDaLista(): string {
  const linhas = CONTAS.map(
    (c) => `${c.cadencia.padEnd(10)} ${(c.instagram ?? "—").padEnd(28)} ${(c.x ?? "—").padEnd(20)} ${c.nome}`,
  );
  return [`${CONTAS.length} contas na lista fechada`, "", ...linhas].join("\n");
}
