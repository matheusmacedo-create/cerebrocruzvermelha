import { timingSafeEqual } from "node:crypto";

/**
 * A porta do contrato.
 *
 * Com PAUTA_TOKEN configurado, toda rota do contrato (pauta, feedback, grafo,
 * relacionados) exige `Authorization: Bearer <token>`. Sem ele configurado a
 * porta fica aberta — e /api/saude avisa que está. Fechar por conta própria
 * quebraria a Redação em produção antes de alguém colar o mesmo segredo nos
 * dois lados; avisar alto é o que dá para fazer daqui.
 */
export function contratoAberto(): boolean {
  return !process.env.PAUTA_TOKEN?.trim();
}

export function autorizadoNoContrato(req: Request): boolean {
  const segredo = process.env.PAUTA_TOKEN?.trim();
  if (!segredo) return true;
  const auth = req.headers.get("authorization") ?? "";
  const enviado = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return iguais(enviado, segredo);
}

/** Rotas de operação (coleta, diagnóstico completo): o segredo do Cron. */
export function autorizadoNaOperacao(req: Request): boolean {
  const segredo = process.env.CRON_SECRET?.trim();
  if (!segredo) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization") ?? "";
  const enviado = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return iguais(enviado, segredo);
}

/** Comparação em tempo constante: um segredo não se adivinha letra a letra. */
function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length || x.length === 0) return false;
  return timingSafeEqual(x, y);
}
