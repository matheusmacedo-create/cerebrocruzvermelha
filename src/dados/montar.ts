import type { Acervo, Item, SaudeFonte } from "@/core/tipos";
import { decidir } from "@/core/mente";
import { relevanciaDe } from "./acervo";
import { SEMENTE } from "./acervo";

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

  const itens = [...porId.values()].map((item) => {
    if (item.plataforma !== "instagram") return item;
    const s = decidir(item, ctx);
    return { ...item, rel: relevanciaDe(s.total) };
  });

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
