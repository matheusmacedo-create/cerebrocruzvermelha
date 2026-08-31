import { CONTAS, perfisInstagram } from "@/core/contas";
import type { Conta } from "@/core/tipos";

/**
 * Inputs dos actors da Apify, gerados a partir da lista fechada.
 *
 * A lista de perfis nunca é digitada à mão num painel: ela sai de
 * `src/core/contas.ts`. Alterar a lista é alterar o código, com revisão.
 */

/** Cadências e o intervalo de coleta correspondente, em horas. */
export const JANELA_HORAS: Record<Conta["cadencia"], number> = {
  tempo_real: 6,
  diario: 30,
  "3_dias": 78,
  "10_dias": 246,
};

export type Cadencia = Conta["cadencia"];

/** Actor: apify/instagram-post-scraper */
export interface InputInstagram {
  username: string[];
  resultsLimit: number;
  onlyPostsNewerThan?: string;
  skipPinnedPosts: boolean;
}

export function inputInstagram(cadencia: Cadencia, agora = new Date()): InputInstagram {
  const perfis = perfisInstagram((c) => c.cadencia === cadencia);
  const desde = new Date(agora.getTime() - JANELA_HORAS[cadencia] * 36e5);
  return {
    username: perfis,
    // Teto por perfil. Segura o custo e evita puxar arquivo antigo.
    resultsLimit: cadencia === "tempo_real" ? 12 : 8,
    // Filtro de data no lado da Apify: peça velha nem chega ao Cérebro.
    onlyPostsNewerThan: desde.toISOString().slice(0, 10),
    // Post fixado é institucional antigo. Não é sinal.
    skipPinnedPosts: true,
  };
}

/** Um input por cadência — cada um vira uma Task agendada na Apify. */
export function todosOsInputsInstagram(agora = new Date()): Record<Cadencia, InputInstagram> {
  const cadencias: Cadencia[] = ["tempo_real", "diario", "3_dias", "10_dias"];
  return Object.fromEntries(
    cadencias.map((c) => [c, inputInstagram(c, agora)]),
  ) as Record<Cadencia, InputInstagram>;
}

/** Resumo legível da lista, para conferência humana antes de rodar. */
export function resumoDaLista(): string {
  const linhas = CONTAS.map(
    (c) => `${c.cadencia.padEnd(10)} ${(c.instagram ?? "—").padEnd(28)} ${(c.x ?? "—").padEnd(20)} ${c.nome}`,
  );
  return [`${CONTAS.length} contas na lista fechada`, "", ...linhas].join("\n");
}
