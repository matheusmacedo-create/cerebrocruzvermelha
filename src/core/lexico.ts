/** Vocabulário usado no cruzamento lexical. Sem modelo generativo neste passo. */

export const RJ = [
  "rio de janeiro", "carioca", "fluminense", "niterói", "niteroi", "baixada", "duque de caxias",
  "nova iguaçu", "nova iguacu", "são gonçalo", "sao goncalo", "belford roxo", "petrópolis", "petropolis",
  "maré", "mare", "rocinha", "alemão", "alemao", "complexo", "zona norte", "zona oeste", "zona sul",
  "paquetá", "paqueta", "guanabara", "cbmerj", "sedec", "cor-rio", "alerta rio", "supervia", "metrôrio",
  "metrorio", "ioerj", "sms-rio", "hemorio", "inea", "capital fluminense", "município do rio", "municipio do rio",
];

export const URGENTE = [
  "alerta", "emergência", "emergencia", "calamidade", "evacuação", "evacuacao", "sirene", "desabamento",
  "deslizamento", "enchente", "alagamento", "transbordamento", "estágio", "estagio", "vítimas", "vitimas",
  "desaparecid", "resgate", "surto", "epidemia", "crítico", "critico", "urgente", "imediato", "agora",
  "temporal", "vendaval", "granizo", "interdi", "desabrigad", "desalojad",
];

export const EIXO_TERMOS: Record<string, string[]> = {
  grd: [
    "chuva", "desastre", "defesa civil", "risco", "enchente", "deslizamento", "alerta", "clima",
    "temporal", "resiliência", "resiliencia", "abrigo", "desabrigad", "evacuação", "evacuacao",
    "seca", "incêndio", "incendio", "vendaval", "granizo", "sirene", "simulado", "contingência", "contingencia",
  ],
  saude: [
    "saúde", "saude", "vacina", "epidemi", "surto", "dengue", "arbovirose", "mpox", "sarampo", "hospital",
    "posto", "boletim", "vigilância", "vigilancia", "sangue", "doação de sangue", "doacao de sangue",
    "hemocentro", "estoque", "influenza", "covid", "tuberculose", "saúde mental", "saude mental",
  ],
  primeiros_socorros: [
    "primeiros socorros", "rcp", "sbv", "reanimação", "reanimacao", "parada cardíaca", "parada cardiaca",
    "engasgo", "desfibrilador", "dea", "lei lucas", "suporte básico", "suporte basico", "socorrista",
    "curso", "capacitação", "capacitacao", "treinamento", "escola",
  ],
  voluntariado: [
    "voluntári", "voluntari", "doação", "doacao", "mutirão", "mutirao", "engajamento", "comunidade",
    "solidariedade", "arrecadação", "arrecadacao", "campanha", "inscrição", "inscricao",
  ],
  institucional: [
    "cruz vermelha", "crescente vermelho", "ifrc", "cicv", "movimento", "princípios", "principios",
    "humanitári", "humanitari", "filial", "aniversário", "aniversario", "genebra", "henry dunant",
  ],
};

/** Sinais de que existe ação REAL da filial, não só assunto. */
export const ACAO_REAL = [
  "cruz vermelha", "filial", "nossa equipe", "nossos voluntários", "nossos voluntarios",
  "escola de", "curso", "turma", "posto da cruz", "ação da cruz", "acao da cruz",
];

/** Marcas de conteúdo requentado. A nacional já caiu nessa. */
export const PECA_VELHA = [
  "#tbt", "throwback", "relembre", "há um ano", "ha um ano", "em 2021", "em 2020", "em 2019",
  "arquivo", "retrospectiva", "recordar",
];

export function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Gabaritos operacionais: tempo e tr\u00e2nsito.
 *
 * O COR-Rio e o Alerta Rio publicam o MESMO servi\u00e7o com dezenas de aberturas
 * \u2014 "TEMPO AGORA", "NOITE DE TER\u00c7A COM\u2026", "QUARTA-FEIRA (2/9) COM\u2026",
 * "BOLETIM DE VENTOS", "ATUALIZA\u00c7\u00c3O | FAIXA LIBERADA\u2026". Assinar a fam\u00edlia
 * pelas duas primeiras palavras fragmenta isso em vinte fam\u00edlias e a tela de
 * aten\u00e7\u00e3o vira um notici\u00e1rio de meteorologia. O que define a fam\u00edlia aqui \u00e9
 * o servi\u00e7o, n\u00e3o a manchete do dia.
 */
export const GABARITO_TEMPO = [
  "tempo agora", "tempo hoje", "proximos dias", "aviso meteorologico", "previsao",
  "pancada", "chuva", "chove", "vento", "rajada", "nebulosidade", "frente fria",
  "ressaca", "pluviom", "temperatura", "umidade", "geada", "vendaval", "tempestade",
  "granizo", "calor", "ceu ",
];

export const GABARITO_TRANSITO = [
  "atualizacao", "faixa", "interdi", "acidente", "liberad", "transito", "brt",
  "calha", "engarrafamento", "retencao", "desvio", "bloqueio", "enguica",
  "avenida", "tunel", "elevado", "linha vermelha", "linha amarela", "ponte rio",
  "estrada", "rodovia", "via expressa", "ciclovia", "vazamento",
];

/**
 * A abertura em caixa alta do t\u00edtulo \u2014 o peda\u00e7o "gritado" que caracteriza
 * boletim. Ignora n\u00fameros, datas, emoji e o separador "|"; para na primeira
 * palavra com min\u00fascula. Menos de duas palavras n\u00e3o \u00e9 gabarito.
 */
export function aberturaDeBoletim(titulo: string): string | null {
  const abertura: string[] = [];
  for (const p of titulo.trim().split(/\s+/)) {
    // O indicador ordinal \u2014 "(1\u00ba/9)" \u2014 \u00e9 letra para o Unicode, mas \u00e9 data,
    // n\u00e3o palavra: sem tir\u00e1-lo, ele encerraria a abertura no meio.
    const letras = p.replace(/[\u00ba\u00aa]/gu, "").replace(/[^\p{L}]/gu, "");
    if (letras.length === 0) continue; // "(31/8)", "|", emoji \u2014 n\u00e3o quebram a sequ\u00eancia
    if (letras.length < 2 || letras !== letras.toLocaleUpperCase("pt-BR")) break;
    abertura.push(letras);
  }
  return abertura.length >= 2 ? normalizar(abertura.join(" ")) : null;
}

/** De que servi\u00e7o \u00e9 este boletim \u2014 ou null quando n\u00e3o \u00e9 boletim. */
export function gabaritoOperacional(titulo: string): "tempo" | "transito" | null {
  const abertura = aberturaDeBoletim(titulo);
  if (!abertura) return null;
  if (GABARITO_TEMPO.some((t) => abertura.includes(t))) return "tempo";
  if (GABARITO_TRANSITO.some((t) => abertura.includes(t))) return "transito";
  return null;
}

/** Quantos termos da lista aparecem no texto. */
export function conta(texto: string, termos: string[]): number {
  const t = normalizar(texto);
  return termos.filter((termo) => t.includes(normalizar(termo))).length;
}

export function bate(texto: string, termos: string[]): boolean {
  return conta(texto, termos) > 0;
}
