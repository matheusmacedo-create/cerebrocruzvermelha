import type { Acervo, Item, Relevancia } from "@/core/tipos";
import { decidir, type ContextoDecisao } from "@/core/mente";
import { comDiasDeHoje } from "@/core/calendario";
import { CHAVE_ACERVO, KV_STORE, lerKV, temToken } from "@/apify/cliente";
import semente from "./seed/acervo-2026-08-30.json";

/**
 * De onde a UI lê.
 *
 * Ordem: snapshot no Key-Value Store da Apify → acervo semente do repositório.
 * A semente é a coleta real de 30/08/2026 (263 sinais, 29 peças, 52 datas).
 * Ela existe para o Cérebro nunca abrir vazio: sem token da Apify, sem rede,
 * ou numa run que falhou, a tela continua sendo uma tela de trabalho.
 */

/**
 * A semente foi coletada antes de o Cérebro ter o campo `plataforma`.
 * Em vez de mascarar isso com um cast, deduzimos a plataforma do tipo de
 * item — assim tudo que sai daqui satisfaz o contrato de verdade.
 */
function plataformaDe(tipo: string, fonte: string): Item["plataforma"] {
  if (tipo === "reels" || tipo === "post_instagram") return "instagram";
  if (tipo === "diario_oficial" || tipo === "trecho_oficial") return "html";
  if (tipo === "aviso_meteorologico" || tipo === "pluviometria") return "api";
  if (tipo === "apelo" || tipo === "evento" || tipo === "sociedade_nacional") return "api";
  if (fonte === "Calendário CVRJ") return "calendario";
  return "rss";
}

const SEMENTE: Omit<Acervo, "origem"> = (() => {
  const cru = semente as unknown as Omit<Acervo, "origem"> & { itens: Partial<Item>[] };
  return {
    ...cru,
    itens: cru.itens.map((i) => ({
      ...i,
      plataforma: i.plataforma ?? plataformaDe(i.tipo ?? "", i.fonte ?? ""),
    })) as Item[],
  };
})();

/**
 * `fresco` pula o cache. As telas leem do cache; o diagnóstico não, porque
 * um painel de saúde que mostra estado de 15 minutos atrás engana quem está
 * justamente tentando descobrir se a coleta funcionou.
 */
export async function carregarAcervo(fresco = false): Promise<Acervo> {
  if (temToken() && KV_STORE) {
    try {
      const kv = await lerKV<Omit<Acervo, "origem">>(KV_STORE, CHAVE_ACERVO, fresco);
      // "Hoje" é hoje, não o dia da coleta: sem isto o calendário mostrava
      // "em 2 dias" para o que já tinha passado sempre que o webhook parava.
      if (kv?.itens?.length) {
        const vivo: Acervo = { ...kv, origem: "apify" };
        return comDiasDeHoje(vivo);
      }
    } catch (e) {
      // Uma falha da Apify nunca derruba a tela. Ela cai para a semente
      // e a origem no cabeçalho conta a verdade para quem está olhando.
      console.error("[acervo] falha ao ler o snapshot da Apify:", e);
    }
  }
  const semente: Acervo = { ...SEMENTE, origem: "seed" };
  return comDiasDeHoje(semente);
}

/** Aplica o motor de decisão sobre os itens e devolve os ordenados por nota. */
export function pontuar(itens: Item[], ctx: ContextoDecisao) {
  return itens
    .map((item) => ({ item, score: decidir(item, ctx) }))
    .sort((a, b) => b.score.total - a.score.total);
}

export function relevanciaDe(total: number): Relevancia {
  if (total >= 65) return "alta";
  if (total >= 38) return "media";
  return "baixa";
}

export { SEMENTE };
