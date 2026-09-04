import type { Acervo } from "./tipos";

/**
 * O relógio do Cérebro.
 *
 * O snapshot guarda a data da coleta, e as telas leem dali quantos dias
 * faltam para cada data do calendário. Quando o webhook para por um fim de
 * semana — ou quando a tela cai na semente — o Cérebro vive no dia da última
 * coleta: mostra "em 2 dias" para o que já passou e nunca envelhece um
 * boletim. Aqui "hoje" é sempre hoje, no fuso do Rio.
 */

const FUSO = "America/Sao_Paulo";

/** A data de hoje no Rio, em AAAA-MM-DD. */
export function hojeNoRio(agora: number = Date.now()): string {
  // en-CA formata como ISO (2026-09-04); é o atalho mais curto para a data
  // civil de um fuso sem depender de biblioteca.
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

/** Dias inteiros de `hoje` até `data` (AAAA-MM-DD); negativo quando já passou. */
export function diasAte(data: string, hoje: string): number | null {
  const a = Date.parse(`${data.slice(0, 10)}T12:00:00Z`);
  const b = Date.parse(`${hoje}T12:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((a - b) / 86_400_000);
}

/** O status de uma data do calendário, olhando de hoje. */
export function statusDaData(dias: number | null): string {
  if (dias === null) return "sem data";
  if (dias < 0) return "passou";
  if (dias === 0) return "hoje";
  if (dias <= 7) return "esta semana";
  if (dias <= 30) return "este mês";
  return "adiante";
}

/**
 * O acervo com `hoje` e os `dias` do calendário recalculados agora.
 *
 * `gerado_em` continua dizendo quando a coleta rodou — é outra informação, e
 * o Topo mostra as duas.
 */
export function comDiasDeHoje<T extends Pick<Acervo, "hoje" | "calendario" | "propostas">>(acervo: T, agora: number = Date.now()): T {
  const hoje = hojeNoRio(agora);
  return {
    ...acervo,
    hoje,
    calendario: acervo.calendario.map((d) => {
      const dias = diasAte(d.data, hoje);
      return dias === null ? d : { ...d, dias, status: statusDaData(dias) };
    }),
    propostas: acervo.propostas.map((p) => {
      if (!p.data) return p;
      const dias = diasAte(p.data, hoje);
      return dias === null ? p : { ...p, dias, status_data: statusDaData(dias) };
    }),
  };
}
