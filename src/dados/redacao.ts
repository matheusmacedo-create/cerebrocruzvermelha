/**
 * O que a Redação devolve ao Cérebro — a fase 2 do contrato.
 *
 * O motor sempre aceitou `jaPublicado` e `acoesDaCasa` no ContextoDecisao,
 * mas ninguém preenchia. A Redação agora expõe os dois em
 * GET /api/cerebro/contexto: os títulos do que foi ao ar e as atividades do
 * Registrar. Com isso `medirIneditismo` deixa de depender só de marca textual
 * de conteúdo requentado, e `medirAcaoReal` passa a saber o que a filial fez
 * de verdade — que é o que separa um filtro de algo que aprende com a
 * operação.
 *
 * Falha aqui nunca derruba nada: sem REDACAO_URL, sem rede ou com a Redação
 * fora do ar, o Cérebro decide como sempre decidiu — só sem esses dois dados.
 */

export interface ContextoDaRedacao {
  jaPublicado?: string[];
  acoesDaCasa?: string[];
}

/** 5 minutos de cache: pontuar roda a cada tela, publicar não. */
const REVALIDAR_S = 300;

export async function lerContextoDaRedacao(): Promise<ContextoDaRedacao> {
  const base = process.env.REDACAO_URL?.replace(/\/$/, "");
  if (!base) return {};

  try {
    const cabecalhos: Record<string, string> = {};
    if (process.env.REDACAO_CONTEXTO_TOKEN) {
      cabecalhos.Authorization = `Bearer ${process.env.REDACAO_CONTEXTO_TOKEN}`;
    }
    const r = await fetch(`${base}/api/cerebro/contexto`, {
      headers: cabecalhos,
      next: { revalidate: REVALIDAR_S },
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) return {};

    const d = (await r.json()) as { jaPublicado?: unknown; acoesDaCasa?: unknown };
    return {
      jaPublicado: listaDeTextos(d.jaPublicado),
      acoesDaCasa: listaDeTextos(d.acoesDaCasa),
    };
  } catch {
    // Sem log barulhento: a Redação pode simplesmente ainda não ter a rota,
    // e o Cérebro funcionava sem ela desde o primeiro dia.
    return {};
  }
}

function listaDeTextos(valor: unknown): string[] | undefined {
  if (!Array.isArray(valor)) return undefined;
  const lista = valor.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  return lista.length > 0 ? lista : undefined;
}
