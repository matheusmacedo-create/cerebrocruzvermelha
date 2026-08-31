import type { Conta, Eixo, Item, Modo, Score, Veredito } from "./tipos";
import { SOMENTE_INTERNO, contaPorHandle, resolverConta } from "./contas";
import { ACAO_REAL, EIXO_TERMOS, PECA_VELHA, RJ, URGENTE, bate, conta as contaTermos } from "./lexico";

/**
 * O motor de decisão.
 *
 * Sete perguntas, cada uma de 0 a 100, com pesos. A soma vira um modo.
 * Toda nota registra o porquê: uma recomendação que não sabe se explicar
 * não deveria mexer no calendário de ninguém.
 *
 * Método: regras + cruzamento lexical eixo↔fonte. Sem modelo generativo.
 */

const PESOS = {
  localidade: 0.24,
  urgencia: 0.2,
  relacao: 0.24,
  acaoReal: 0.14,
  ineditismo: 0.08,
  confianca: 0.1,
} as const;

export interface ContextoDecisao {
  /** Data de referência da coleta (ISO). */
  hoje: string;
  /**
   * Ganchos já publicados pela Casa, normalizados.
   * Sem isso o Cérebro repete o que a filial acabou de postar.
   */
  jaPublicado?: string[];
  /**
   * Ações confirmadas da filial no período — o "registrar".
   * Sem ação real, balanço de terceiro não vira peça.
   */
  acoesDaCasa?: string[];
}


/**
 * Isto é um sinal, ou é só uma página?
 *
 * Coletor de HTML por âncora traz o menu do site junto com a notícia:
 * catálogo de curso, página institucional, matéria de 2021 sem data.
 * Nada disso é evento — não há fato novo, não há o que decidir.
 *
 * Sem esta trava o Cérebro promove "Ônibus de vacinação da Cruz Vermelha"
 * de 2021 a pauta de hoje: exatamente a armadilha que ele existe para evitar.
 * Estes itens continuam no acervo como catálogo e nunca disputam atenção.
 */
const FIM_DE_CHAMADA = /\b(saiba mais|leia mais|ver mais|conhecer o projeto|conhecer cursos|clique aqui|acesse aqui)\s*$/i;

export function ehSinal(item: Item): boolean {
  const temData = Boolean(item.quando?.trim()) && !Number.isNaN(new Date(item.quando).getTime());
  const temCorpo = (item.resumo ?? "").trim().length >= 40;
  // Datas do calendário são compromissos, não coletas — passam direto.
  if (item.grupo === "calendario") return true;
  if (FIM_DE_CHAMADA.test(item.titulo.trim())) return false;
  return temData || temCorpo;
}

export function decidir(item: Item, ctx: ContextoDecisao): Score {
  const texto = `${item.titulo} ${item.resumo}`;
  const c = resolverConta(item);
  const porque: string[] = [];

  if (!ehSinal(item)) {
    return {
      localidade: 0, urgencia: 0, relacao: 0, acaoReal: 0, ineditismo: 0, confianca: 0,
      total: 0,
      modo: "arquivar",
      veredito: "nao",
      porque: [
        "Não é um sinal: página sem data e sem corpo, raspada junto com a notícia.",
        "Fica no acervo como catálogo. Não disputa atenção nem entra no calendário.",
      ],
    };
  }

  const localidade = medirLocalidade(texto, c, porque);
  const urgencia = medirUrgencia(texto, item, porque);
  const { nota: relacao, eixo } = medirRelacao(texto, c, porque);
  const acaoReal = medirAcaoReal(texto, c, ctx, porque);
  const ineditismo = medirIneditismo(texto, ctx, porque);
  const confianca = medirConfianca(item, c, porque);

  let total = Math.round(
    localidade * PESOS.localidade +
      urgencia * PESOS.urgencia +
      relacao * PESOS.relacao +
      acaoReal * PESOS.acaoReal +
      ineditismo * PESOS.ineditismo +
      confianca * PESOS.confianca,
  );

  // ─── Travas duras. Elas mandam mais que a soma. ───────────────────────
  if (c && SOMENTE_INTERNO.has(c.id)) {
    porque.push(`${c.nome} é fonte de uso interno — informa deslocamento, nunca vira peça pública.`);
    return montar({ localidade, urgencia, relacao, acaoReal, ineditismo, confianca }, total, "monitorar", "nao", porque, eixo);
  }
  if (relacao < 25) {
    porque.push("Não encosta em nenhum eixo da filial. Boa informação, pauta de outra pessoa.");
    total = Math.min(total, 30);
  }
  if (localidade < 20 && urgencia < 60) {
    porque.push("Fora do Rio e sem urgência. A filial do RJ não precisa responder.");
    total = Math.min(total, 32);
  }
  if (ineditismo < 20) {
    porque.push("A Casa já falou disso. Repetir gancho gasta audiência.");
    total = Math.min(total, 40);
  }

  const modo = modoDe(total, urgencia, acaoReal);
  const veredito = vereditoDe(modo);
  return montar({ localidade, urgencia, relacao, acaoReal, ineditismo, confianca }, total, modo, veredito, porque, eixo);
}

function montar(
  n: Omit<Score, "total" | "modo" | "veredito" | "porque">,
  total: number,
  modo: Modo,
  veredito: Veredito,
  porque: string[],
  eixo?: Eixo,
): Score & { eixo?: Eixo } {
  return { ...n, total, modo, veredito, porque, eixo };
}

// ─── É local? ────────────────────────────────────────────────────────────
function medirLocalidade(texto: string, c: Conta | undefined, porque: string[]): number {
  const hits = contaTermos(texto, RJ);
  if (hits >= 2) {
    porque.push("Nomeia o Rio mais de uma vez. É território da filial.");
    return 100;
  }
  if (hits === 1) {
    porque.push("Cita o Rio de Janeiro.");
    return 80;
  }
  // Uma conta que só fala do Rio torna o sinal local mesmo sem dizer "Rio".
  if (c && ["cor-rio", "alerta-rio", "defesacivil-rio", "sedec-rj", "cbmerj", "inea", "sms-rio", "ses-rj", "hemorio", "voz-comunidades", "mare-noticias", "fala-roca", "agencia-lume", "labjaca", "fogo-cruzado", "ott-rio", "metrorio", "supervia", "ccr-barcas", "cvrj"].includes(c.id)) {
    porque.push(`${c.nome} só publica sobre o Rio — o sinal é local por origem.`);
    return 85;
  }
  if (c?.vinculo === "movimento") {
    porque.push("Conta do movimento, alcance nacional ou global. Precisa citar o Rio para virar assunto daqui.");
    return 25;
  }
  porque.push("Não é possível localizar no RJ pelo texto.");
  return 10;
}

// ─── É urgente? ──────────────────────────────────────────────────────────
function medirUrgencia(texto: string, item: Item, porque: string[]): number {
  const hits = contaTermos(texto, URGENTE);
  const horas = idadeEmHoras(item.quando);
  let n = Math.min(100, hits * 28);

  if (horas !== null) {
    if (horas <= 6) n = Math.min(100, n + 20);
    else if (horas > 72) n = Math.max(0, n - 25);
  }
  if (n >= 70) porque.push("Linguagem de emergência e sinal recente. Pode interromper o calendário.");
  else if (n >= 40) porque.push("Tem componente de urgência, mas não é ruptura.");
  else porque.push("Sem urgência. Dá para planejar com antecedência.");
  return Math.round(n);
}

// ─── Tem relação conosco? ────────────────────────────────────────────────
function medirRelacao(texto: string, c: Conta | undefined, porque: string[]): { nota: number; eixo?: Eixo } {
  let melhor: Eixo | undefined;
  let melhorHits = 0;
  for (const [eixo, termos] of Object.entries(EIXO_TERMOS)) {
    const h = contaTermos(texto, termos);
    if (h > melhorHits) {
      melhorHits = h;
      melhor = eixo as Eixo;
    }
  }
  let n = Math.min(100, melhorHits * 26);
  // Uma conta declarada num eixo empurra o sinal para esse eixo.
  if (c && melhor && c.eixos.includes(melhor)) n = Math.min(100, n + 18);
  if (c?.vinculo === "casa") n = Math.max(n, 85);

  if (melhor && n >= 55) porque.push(`Encosta no eixo ${melhor.replace("_", " ")}.`);
  else if (melhor) porque.push(`Toca de leve o eixo ${melhor.replace("_", " ")}, sem centro.`);
  else porque.push("Nenhum eixo da filial aparece no texto.");
  return { nota: Math.round(n), eixo: melhor };
}

// ─── Existe ação real da Casa? ───────────────────────────────────────────
function medirAcaoReal(texto: string, c: Conta | undefined, ctx: ContextoDecisao, porque: string[]): number {
  if (c?.vinculo === "casa") {
    porque.push("É a própria filial publicando. A ação é dela.");
    return 100;
  }
  const registrado = (ctx.acoesDaCasa ?? []).some((a) => {
    const termos = a.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    return termos.some((w) => texto.toLowerCase().includes(w));
  });
  if (registrado) {
    porque.push("Existe ação da filial ligada a este assunto no registrar.");
    return 90;
  }
  if (bate(texto, ACAO_REAL)) {
    porque.push("O texto cita a Cruz Vermelha, mas o registrar não confirma ação da filial. Conferir antes de prometer.");
    return 45;
  }
  porque.push("Nenhuma ação da filial ligada a este sinal. Sem operação própria, não vira post de balanço.");
  return 12;
}

// ─── Já falamos disso? ───────────────────────────────────────────────────
function medirIneditismo(texto: string, ctx: ContextoDecisao, porque: string[]): number {
  if (bate(texto, PECA_VELHA)) {
    porque.push("Marcas de conteúdo requentado. Filtro de data reprova.");
    return 8;
  }
  const publicados = ctx.jaPublicado ?? [];
  const repetido = publicados.some((p) => {
    const chaves = p.toLowerCase().split(/\s+/).filter((w) => w.length > 5);
    if (chaves.length === 0) return false;
    const achou = chaves.filter((w) => texto.toLowerCase().includes(w)).length;
    return achou / chaves.length > 0.5;
  });
  if (repetido) {
    porque.push("Gancho muito parecido com algo que a Casa já publicou.");
    return 15;
  }
  return 85;
}

// ─── Temos fonte confiável? ──────────────────────────────────────────────
function medirConfianca(item: Item, c: Conta | undefined, porque: string[]): number {
  if (!c) {
    porque.push(`Fonte "${item.fonte}" sem conta na lista fechada. Confiança média por padrão.`);
    return 55;
  }
  const porVinculo: Record<Conta["vinculo"], number> = {
    casa: 100,
    oficial: 95,
    movimento: 85,
    servico: 80,
    comunitario: 65,
    monitor: 40,
  };
  const n = porVinculo[c.vinculo];
  if (n >= 85) porque.push(`${c.nome} é fonte oficial. Serve de base para o fato.`);
  else if (n >= 60) porque.push(`${c.nome} é mídia de território. Ótimo para saber onde ir, exige confirmação oficial antes de virar fato.`);
  else porque.push(`${c.nome} não é fonte verificada. Não sustenta peça pública.`);
  return n;
}

// ─── Da nota para a decisão ──────────────────────────────────────────────
function modoDe(total: number, urgencia: number, acaoReal: number): Modo {
  if (total >= 80 && urgencia >= 70) return "agir_agora";
  if (total >= 72) return acaoReal >= 60 ? "produzir" : "avaliar";
  if (total >= 55) return "agendar";
  if (total >= 40) return "avaliar";
  if (total >= 28) return "monitorar";
  return "arquivar";
}

function vereditoDe(modo: Modo): Veredito {
  if (modo === "agir_agora" || modo === "produzir") return "sim";
  if (modo === "agendar" || modo === "avaliar") return "quase";
  if (modo === "monitorar") return "nao";
  return "nao";
}

export function idadeEmHoras(quando: string): number | null {
  const d = new Date(quando);
  if (Number.isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / 36e5;
}

/** Rótulos exibidos na UI. */
export const MODO_ROTULO: Record<Modo, string> = {
  agir_agora: "Agir agora",
  produzir: "Produzir",
  agendar: "Agendar",
  avaliar: "Avaliar",
  monitorar: "Monitorar",
  arquivar: "Arquivar",
  folga_ou_plantao: "Folga ou plantão",
};

export const VEREDITO_ROTULO: Record<Veredito, string> = {
  sim: "vira matéria",
  quase: "quase",
  nao: "não entra",
  aprender: "peça viva",
};

export { contaPorHandle };
