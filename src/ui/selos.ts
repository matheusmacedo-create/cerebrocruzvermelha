import type { Direito, Modo, Relevancia, Veredito } from "@/core/tipos";

export function corDoModo(m: Modo): string {
  if (m === "agir_agora") return "vermelho";
  if (m === "produzir") return "vermelho";
  if (m === "agendar") return "ambar";
  if (m === "avaliar") return "ambar";
  if (m === "monitorar") return "azul";
  if (m === "folga_ou_plantao") return "azul";
  return "verde";
}

export function corDaRelevancia(r: Relevancia): string {
  return r === "alta" ? "alta" : r === "media" ? "media" : "baixa";
}

export function corDoVeredito(v: Veredito): string {
  if (v === "sim") return "vermelho";
  if (v === "quase") return "ambar";
  if (v === "aprender") return "azul";
  return "verde";
}

/** Direito autorizado é o único verde: é o único que pode ser publicado. */
export function corDoDireito(d: Direito): string {
  if (d === "autorizado") return "verde";
  if (d === "oficial" || d === "movimento") return "ambar";
  return "vermelho";
}

export function faixaDeAtencao(total: number): string {
  if (total >= 72) return "";
  if (total >= 55) return "media";
  if (total >= 38) return "info";
  return "baixa";
}
