import type { Aceite, Conta, Eixo, Item, Modo, Recusa, Score, Veredito } from "./tipos";
import { SOMENTE_INTERNO, contaPorHandle, resolverConta } from "./contas";
import { ACAO_REAL, EIXO_TERMOS, GRAVE, PECA_VELHA, RJ, URGENTE, bate, conta as contaTermos, gabaritoOperacional, normalizar } from "./lexico";
import { assinatura } from "./agrupar";

/**
 * O motor de decisão.
 *
 * Seis perguntas, cada uma de 0 a 100, com pesos. A soma vira um modo.
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
   * O instante "agora" (ISO). Só os testes preenchem: a idade de um sinal
   * precisa ser a mesma hoje e daqui a um mês para o caso continuar valendo.
   */
  agora?: string;
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
  /**
   * O que a equipe já recusou, com o motivo.
   * Sem isto o Cérebro repete a sugestão que acabou de ouvir "não".
   */
  recusados?: Recusa[];
  /**
   * O que a Redação pautou e publicou a partir do Cérebro.
   * É o "sim" do laço: sinal publicado sai da atenção, e a família dele
   * perde ineditismo por uns dias.
   */
  aceites?: Aceite[];
}

/** Contas que só publicam sobre o Rio: o sinal é local por origem. */
const SO_DO_RIO = new Set([
  "cor-rio", "alerta-rio", "defesacivil-rio", "sedec-rj", "cbmerj", "inea", "sms-rio", "ses-rj", "hemorio",
  "voz-comunidades", "mare-noticias", "fala-roca", "agencia-lume", "labjaca", "fogo-cruzado", "ott-rio",
  "metrorio", "supervia", "ccr-barcas", "cvrj",
]);

/** Meia-vida de uma recusa por repetição: em três semanas ela vale metade. */
const MEIA_VIDA_RECUSA_DIAS = 21;
/** Uma publicação da Casa esfria a família do sinal por este período. */
const JANELA_PUBLICADO_DIAS = 7;

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
  const agora = instante(ctx);

  const recusa = recusaQueAlcanca(item, ctx, agora);
  if (recusa) {
    return {
      localidade: 0, urgencia: 0, relacao: 0, acaoReal: 0, ineditismo: 0, confianca: 0,
      total: 0,
      modo: "arquivar",
      veredito: "nao",
      porque: [
        recusa.id === item.id
          ? `Você recusou este sinal: ${MOTIVO_CURTO[recusa.motivo]}.`
          : `Você recusou esta mesma notícia por outro caminho (${recusa.fonte}): ${MOTIVO_CURTO[recusa.motivo]}.`,
        "Fica no acervo como decisão registrada. Não volta a disputar atenção.",
      ],
    };
  }

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
  const urgencia = medirUrgencia(texto, item, agora, porque);
  const { nota: relacao, eixo } = medirRelacao(texto, c, porque);
  const acaoReal = medirAcaoReal(texto, c, ctx, porque);
  const ineditismo = medirIneditismo(item, texto, ctx, agora, urgencia, porque, c);
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
  // O sinal que a Casa já publicou não disputa mais atenção: a peça saiu.
  const publicado = aceiteDe(item, ctx, "publicado", agora);
  if (publicado) {
    porque.push(`A Casa já publicou este sinal${publicado.canais?.length ? ` (${publicado.canais.join(", ")})` : ""}. Saiu da atenção; fica como histórico.`);
    total = Math.min(total, 25);
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
  // Boletim operacional é perecível: "TEMPO AGORA" e "FAIXA LIBERADA" de
  // dois dias atrás são histórico, não pauta — sem esta trava eles seguem
  // disputando a tela de atenção por dias, que é o ruído que o Cérebro
  // existe para tirar da frente. Fato grave não perece com o boletim.
  if (perecivel(item) && !bate(texto, GRAVE)) {
    const horas = idadeEmHoras(item.quando, agora);
    if (horas !== null && horas > 48) {
      porque.push("Boletim operacional com mais de 48h. Já virou histórico: fica no acervo, não na atenção.");
      total = Math.min(total, 30);
    }
  }

  const pautado = aceiteDe(item, ctx, "pautado", agora);
  if (pautado && !publicado) {
    porque.push("Já está em pauta na Redação: existe um pacote aberto para este sinal.");
  }

  const modo = modoDe(total, urgencia, acaoReal);
  const veredito = vereditoDe(modo);
  return montar({ localidade, urgencia, relacao, acaoReal, ineditismo, confianca }, total, modo, veredito, porque, eixo);
}

function montar(
  n: Omit<Score, "total" | "modo" | "veredito" | "porque" | "eixo">,
  total: number,
  modo: Modo,
  veredito: Veredito,
  porque: string[],
  eixo?: Eixo,
): Score {
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
  if (c && SO_DO_RIO.has(c.id)) {
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
function medirUrgencia(texto: string, item: Item, agora: number, porque: string[]): number {
  const hits = contaTermos(texto, URGENTE);
  const horas = idadeEmHoras(item.quando, agora);
  let n = Math.min(100, hits * 28);

  // Data no futuro é compromisso, não fato recente: não ganha bônus de
  // frescor — o calendário já cuida dele.
  if (horas !== null) {
    if (horas >= -1 && horas <= 6) n = Math.min(100, n + 20);
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
  // Uma palavra em comum não é ação: "curso" e "saúde" estão em qualquer
  // texto. Duas palavras com conteúdo, sim.
  const t = normalizar(texto);
  const registrado = (ctx.acoesDaCasa ?? []).some((a) => palavrasComConteudo(a).filter((w) => t.includes(w)).length >= 2);
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
function medirIneditismo(
  item: Item,
  texto: string,
  ctx: ContextoDecisao,
  agora: number,
  urgencia: number,
  porque: string[],
  conta?: Conta,
): number {
  if (bate(texto, PECA_VELHA)) {
    porque.push("Marcas de conteúdo requentado. Filtro de data reprova.");
    return 8;
  }

  // A Casa publicou um boletim desta mesma família há poucos dias: o assunto
  // não é inédito, mesmo que este post seja.
  const daFamilia = publicadoNaFamilia(item, ctx, agora);
  if (daFamilia) {
    porque.push(`A Casa publicou sobre isto há ${daFamilia} dia(s), a partir de um sinal desta mesma família.`);
    return 30;
  }

  // Recusa por repetição é sobre a família do boletim, não sobre a conta
  // inteira — e esfria com o tempo. Três "repetitivo" em boletins de tempo
  // recuam o "TEMPO AGORA" de amanhã, não o Estágio 5 do mês que vem. E uma
  // escalada real (urgência alta) nunca é repetição.
  const cansaco = cansacoDaFamilia(item, ctx, agora, conta);
  if (cansaco >= 0.5 && urgencia < 70) {
    porque.push(
      `Você recusou sugestão(ões) desta família por repetição há pouco (peso ${cansaco.toFixed(1)}). O Cérebro recua nela até vir algo diferente.`,
    );
    return Math.round(Math.max(10, 85 - cansaco * 25));
  }

  const chavesDoTexto = normalizar(texto);
  const repetido = (ctx.jaPublicado ?? []).some((p) => {
    const chaves = palavrasComConteudo(p).filter((w) => w.length > 5);
    if (chaves.length < 2) return false;
    const achou = chaves.filter((w) => chavesDoTexto.includes(w)).length;
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

/** Sinal que perde valor em horas: boletim de tempo/trânsito e aviso meteorológico. */
function perecivel(item: Item): boolean {
  if (item.tipo === "aviso_meteorologico" || item.tipo === "pluviometria") return true;
  return gabaritoOperacional(item.titulo) !== null;
}

// ─── Memória: recusas e aceites ──────────────────────────────────────────

/**
 * A recusa que alcança este item: a dele mesmo, ou a da mesma notícia
 * chegada por outro caminho há pouco — a nota da Defesa Civil recusada no
 * Instagram não deve voltar pelo RSS no dia seguinte.
 */
function recusaQueAlcanca(item: Item, ctx: ContextoDecisao, agora: number): Recusa | undefined {
  const recusas = ctx.recusados ?? [];
  const direta = recusas.find((r) => r.id === item.id);
  if (direta) return direta;
  const minha = assinatura(item);
  if (!minha || !minha.startsWith("noticia::")) return undefined;
  return recusas.find(
    (r) => diasDesde(r.quando, agora) <= JANELA_PUBLICADO_DIAS && assinatura({ titulo: r.titulo, contaId: r.contaId, fonte: r.fonte }) === minha,
  );
}

/**
 * Peso das recusas por repetição que alcançam a família deste item, já
 * descontado o tempo: 1 hoje, 0,5 em três semanas, quase nada em dois meses.
 */
function cansacoDaFamilia(item: Item, ctx: ContextoDecisao, agora: number, conta?: Conta): number {
  if (!conta) return 0;
  const minha = assinatura(item);
  let peso = 0;
  for (const r of ctx.recusados ?? []) {
    if (r.motivo !== "repetitivo" && r.motivo !== "ja_falamos") continue;
    if (r.contaId !== conta.id) continue;
    const dela = assinatura({ titulo: r.titulo, contaId: r.contaId, fonte: r.fonte });
    // Sem família reconhecível de nenhum dos lados, vale a conta inteira —
    // é o comportamento antigo, restrito ao caso em que não há como fazer
    // melhor. Família de um lado só é família diferente.
    if (minha !== dela) continue;
    peso += Math.pow(0.5, diasDesde(r.quando, agora) / MEIA_VIDA_RECUSA_DIAS);
  }
  return peso;
}

/**
 * O aceite que alcança este item: o dele mesmo ou, dentro da janela, o da
 * mesma notícia chegada por outro caminho — publicada a nota do Instagram, o
 * gêmeo do RSS não pode voltar à atenção como chefe da família.
 */
function aceiteDe(item: Item, ctx: ContextoDecisao, evento: Aceite["evento"], agora: number): Aceite | undefined {
  const aceites = ctx.aceites ?? [];
  const direto = aceites.find((a) => a.id === item.id && a.evento === evento);
  if (direto) return direto;
  const minha = assinatura(item);
  if (!minha || !minha.startsWith("noticia::")) return undefined;
  return aceites.find(
    (a) =>
      a.evento === evento &&
      diasDesde(a.quando, agora) <= JANELA_PUBLICADO_DIAS &&
      assinatura({ titulo: a.titulo, contaId: a.contaId, fonte: a.fonte }) === minha,
  );
}

/** Dias desde que a Casa publicou um sinal da mesma família — ou null. */
function publicadoNaFamilia(item: Item, ctx: ContextoDecisao, agora: number): number | null {
  const minha = assinatura(item);
  if (!minha) return null;
  let menor: number | null = null;
  for (const a of ctx.aceites ?? []) {
    if (a.evento !== "publicado" || a.id === item.id) continue;
    const dias = diasDesde(a.quando, agora);
    if (dias > JANELA_PUBLICADO_DIAS) continue;
    if (assinatura({ titulo: a.titulo, contaId: a.contaId, fonte: a.fonte }) !== minha) continue;
    menor = menor === null ? dias : Math.min(menor, dias);
  }
  return menor === null ? null : Math.max(0, Math.round(menor));
}

/**
 * Palavras que não dizem de que assunto se trata, mesmo compridas: duas
 * delas em comum ("sobre" e "cidade") não fazem de um curso a ação da filial.
 */
const SEM_CONTEUDO = new Set([
  "sobre", "ainda", "entre", "contra", "durante", "depois", "antes", "tambem", "quando", "quanto",
  "porque", "todos", "todas", "outro", "outra", "outros", "outras", "muito", "muita", "muitos",
  "muitas", "mesmo", "mesma", "neste", "nesta", "nesse", "nessa", "pelos", "pelas", "apenas",
  "assim", "entao", "agora", "cidade", "pessoas", "estado", "governo", "atraves", "partir",
]);

function palavrasComConteudo(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 4 && !SEM_CONTEUDO.has(w));
}

function instante(ctx: ContextoDecisao): number {
  const t = ctx.agora ? Date.parse(ctx.agora) : NaN;
  return Number.isNaN(t) ? Date.now() : t;
}

function diasDesde(iso: string, agora: number): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Infinity;
  return Math.max(0, (agora - t) / 86_400_000);
}

export function idadeEmHoras(quando: string, agora: number = Date.now()): number | null {
  const d = new Date(quando);
  if (Number.isNaN(d.getTime())) return null;
  return (agora - d.getTime()) / 36e5;
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

const MOTIVO_CURTO: Record<Recusa["motivo"], string> = {
  repetitivo: "repetitivo",
  sem_relacao: "não é pauta da Cruz",
  sem_acao: "sem ação da filial",
  ja_falamos: "a Casa já falou disso",
  fonte_fraca: "fonte não sustenta",
  outro: "julgamento da equipe",
};

export const VEREDITO_ROTULO: Record<Veredito, string> = {
  sim: "vira matéria",
  quase: "quase",
  nao: "não entra",
  aprender: "peça viva",
};

export { contaPorHandle };
