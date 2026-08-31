import type { Acervo, Item, SaudeFonte } from "@/core/tipos";
import { decidir } from "@/core/mente";
import { relevanciaDe } from "./acervo";
import { SEMENTE } from "./acervo";

/**
 * Quantos sinais de rede social o acervo guarda.
 *
 * A coleta roda de hora em hora e o acervo mesclava para sempre — em um mês
 * seriam milhares de itens e outros tantos arquivos de mídia na Apify. Este
 * teto mantém a janela de trabalho da equipe (semanas de coleta) sem deixar
 * o custo crescer sozinho. Sinais documentais e o acervo semente não contam:
 * eles não crescem por run.
 */
export const TETO_ITENS_REDE = 400;

/**
 * Monta o snapshot que vai para o Key-Value Store.
 *
 * Os sinais novos do Instagram entram por cima do acervo existente,
 * deduplicados por id. Calendário e propostas de data continuam vindo da
 * base — eles não dependem de coleta de rede social.
 */
export function montarAcervo(opcoes: {
  novos: Item[];
  base?: Omit<Acervo, "origem">;
  saudeColeta?: SaudeFonte[];
  hoje?: string;
}): Omit<Acervo, "origem"> {
  const base = opcoes.base ?? SEMENTE;
  const hoje = opcoes.hoje ?? new Date().toISOString().slice(0, 10);
  const ctx = { hoje };

  const porId = new Map<string, Item>();
  for (const it of base.itens) porId.set(it.id, it);
  // O sinal recém-coletado ganha do antigo: métrica e legenda mudam.
  for (const it of opcoes.novos) porId.set(it.id, it);

  const todos = [...porId.values()].map((item) => {
    if (item.plataforma !== "instagram") return item;
    const s = decidir(item, ctx);
    return { ...item, rel: relevanciaDe(s.total) };
  });

  // Aplica o teto só na parte que cresce a cada coleta, mantendo os mais recentes.
  const daRede = todos.filter((i) => i.plataforma === "instagram" || i.plataforma === "x");
  const resto = todos.filter((i) => !(i.plataforma === "instagram" || i.plataforma === "x"));
  const recentes = daRede
    .sort((a, b) => (Date.parse(b.quando) || 0) - (Date.parse(a.quando) || 0))
    .slice(0, TETO_ITENS_REDE);
  const itens = [...recentes, ...resto];

  const saude = [...(base.saude ?? []), ...(opcoes.saudeColeta ?? [])];
  // Uma fonte recoletada substitui a leitura anterior.
  const saudeUnica = [...new Map(saude.map((s) => [s.fonte, s])).values()];

  return {
    hoje,
    gerado_em: new Date().toISOString(),
    metodo: "regras + cruzamento lexical eixo↔fonte, sobre lista fechada de contas. Sem modelo generativo.",
    totais: {
      itens: itens.length,
      datas: base.calendario.length,
      propostas: base.propostas.length,
      fontes_ok: saudeUnica.filter((s) => s.ok).length,
      fontes: saudeUnica.length,
      alta: itens.filter((i) => i.rel === "alta").length,
    },
    saude: saudeUnica,
    propostas: base.propostas,
    calendario: base.calendario,
    itens,
  };
}
