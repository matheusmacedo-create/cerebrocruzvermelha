/** Vocabulário usado no cruzamento lexical. Sem modelo generativo neste passo. */

/**
 * Um termo é uma palavra ou expressão — ou, quando a forma importa, uma
 * expressão regular já normalizada (sem acento, minúscula): "estágio 3" é
 * urgência, "estágio 1" é rotina, e só a regex separa os dois.
 */
export type Termo = string | RegExp;

export const RJ: Termo[] = [
  "rio de janeiro", "carioca", "fluminense", "niterói", "baixada fluminense", "baixada", "duque de caxias",
  "nova iguaçu", "são gonçalo", "belford roxo", "petrópolis", "teresópolis", "nova friburgo", "região serrana",
  "maré", "rocinha", "alemão", "complexo", "zona norte", "zona oeste", "zona sul", "grande rio",
  "região metropolitana", "paquetá", "guanabara", "cbmerj", "sedec", "cor-rio", "alerta rio", "supervia",
  "metrôrio", "ioerj", "sms-rio", "hemorio", "inea", "capital fluminense", "município do rio",
  "prefeitura do rio", "estado do rio", "cidade do rio", "governo do estado do rio",
  // Municípios da região metropolitana e do interior onde a filial atua.
  "são joão de meriti", "nilópolis", "mesquita", "magé", "itaboraí", "maricá", "queimados", "japeri",
  "seropédica", "itaguaí", "angra dos reis", "volta redonda", "barra mansa", "resende", "macaé",
  "campos dos goytacazes", "cabo frio", "mangaratiba", "paraíba do sul", "petrópolis",
  // Bairros e territórios com nome inequívoco — "centro" e "campo grande"
  // existem em qualquer cidade e ficam de fora de propósito.
  "copacabana", "ipanema", "leblon", "botafogo", "tijuca", "barra da tijuca", "jacarepaguá", "madureira",
  "bangu", "méier", "ilha do governador", "cidade de deus", "jacarezinho", "manguinhos", "vidigal",
  "morro da providência", "vila kennedy", "complexo da maré", "complexo do alemão", "santa cruz",
];

/**
 * Linguagem de emergência.
 *
 * "Alerta" e "agora" saíram da lista: "Alerta Rio" é nome de fonte e "TEMPO
 * AGORA" é a abertura do boletim mais rotineiro da cidade — com eles, todo
 * boletim de previsão virava urgência. "Estágio" só conta do 3 para cima.
 */
export const URGENTE: Termo[] = [
  "emergência", "calamidade", "evacuação", "sirene", "desabamento", "deslizamento", "enchente",
  "alagamento", "transbordamento", "inundação", /estagio ?[345]\b/, /estagio de (alerta|crise)/,
  "alerta vermelho", "alerta máximo", "alerta laranja", "grande perigo", "perigo",
  "vítimas", "ferid", "óbito", "mort", "desaparecid", "soterrad", "ilhad", "resgat", "socorro",
  "surto", "epidemia", "crítico", "estoque crítico", "urgente", "imediato", "temporal", "vendaval",
  "granizo", "ressaca", "interdi", "desabrigad", "desalojad", "risco de morte",
];

/**
 * Fato grave: o que nunca é rotina, mesmo quando vem num boletim de
 * serviço. Um resgate com feridos não expira em 48 horas como um "TEMPO
 * AGORA" — e não se agrupa com ele.
 */
export const GRAVE: Termo[] = [
  "ferid", "óbito", "mort", "soterrad", "desaparecid", "ilhad", "desabamento",
  "desabrigad", "desalojad", /estagio ?[45]\b/, "calamidade", "evacuação",
];

export const EIXO_TERMOS: Record<string, Termo[]> = {
  grd: [
    "chuva", "desastre", "defesa civil", "risco", "enchente", "deslizamento", "desabamento", "soterr",
    "resgat", "bombeiro", "socorro", "alerta", "clima",
    "temporal", "resiliência", "abrigo", "desabrigad", "evacuação", "inundação", "seca", "estiagem",
    "incêndio", "queimada", "vendaval", "granizo", "sirene", "simulado", "contingência", "ciclone",
    "tempestade", "ressaca", "onda de calor", "frio intenso", "baixa umidade", "ponto de apoio",
    "kit humanitário", "kit de higiene", "cesta básica", "barragem", "leptospirose",
  ],
  saude: [
    "saúde", "vacina", "epidemi", "surto", "dengue", "chikungunya", "zika", "arbovirose", "mpox", "sarampo",
    "hospital", "posto", "boletim", "vigilância", "sangue", "doação de sangue", "hemocentro", "estoque",
    "influenza", "gripe", "covid", "tuberculose", "saúde mental", "hanseníase", "hiv", "aids", "sífilis",
    "testagem", "febre amarela", "leptospirose", "hepatite", "aleitamento", "caps", "suicídio",
    "setembro amarelo", "outubro rosa", "novembro azul", "agosto dourado", "prevenção",
  ],
  primeiros_socorros: [
    "primeiros socorros", "rcp", "sbv", "reanimação", "parada cardíaca", "engasgo", "desfibrilador",
    "dea", "lei lucas", "suporte básico", "socorrista", "curso", "capacitação", "treinamento", "escola",
    "afogamento", "queimadura", "hemorragia", "desmaio", "convulsão", "salvamento aquático",
    "guarda-vidas", "brigadista", "brigada",
  ],
  voluntariado: [
    "voluntári", "voluntariado", "doação", "mutirão", "engajamento", "comunidade", "solidariedade",
    "arrecadação", "campanha", "inscrição", "ponto de coleta", "coleta de doações",
    "campanha do agasalho", "natal solidário", "seja voluntário", "cadastro",
  ],
  institucional: [
    "cruz vermelha", "crescente vermelho", "ifrc", "cicv", "movimento", "princípios", "humanitári",
    "filial", "aniversário", "genebra", "henry dunant", "convenções de genebra",
    "direito internacional humanitário", "dih", "8 de maio", "dia mundial da cruz vermelha",
    "sociedade nacional", "delegação", "parceria", "acordo de cooperação", "diretoria",
  ],
};

/** Sinais de que existe ação REAL da filial, não só assunto. */
export const ACAO_REAL: Termo[] = [
  "cruz vermelha", "filial", "nossa equipe", "nossos voluntários", "nossos socorristas", "nossa unidade",
  "escola de", "curso", "turma", "posto da cruz", "ação da cruz", "cruz vermelha rj", "cvb-rj", "cvbrj",
  "filial do rio", "equipe da cruz", "voluntários da cruz",
];

/**
 * Marcas de conteúdo requentado. A nacional já caiu nessa.
 *
 * Os anos são gerados: "em 2021" envelhece sozinho e ninguém precisa voltar
 * aqui todo janeiro para acrescentar o ano que acabou.
 */
export const PECA_VELHA: Termo[] = [
  "#tbt", "throwback", "relembre", "há um ano", "arquivo", "retrospectiva", "recordar",
  ...anosPassados(new Date().getFullYear()).map((ano) => `em ${ano}`),
];

function anosPassados(anoAtual: number): number[] {
  const anos: number[] = [];
  for (let ano = 2015; ano < anoAtual; ano++) anos.push(ano);
  return anos;
}

export function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Gabaritos operacionais: tempo e trânsito.
 *
 * O COR-Rio e o Alerta Rio publicam o MESMO serviço com dezenas de aberturas
 * — "TEMPO AGORA", "NOITE DE TERÇA COM…", "QUARTA-FEIRA (2/9) COM…",
 * "BOLETIM DE VENTOS", "ATUALIZAÇÃO | FAIXA LIBERADA…". Assinar a família
 * pelas duas primeiras palavras fragmenta isso em vinte famílias e a tela de
 * atenção vira um noticiário de meteorologia. O que define a família aqui é
 * o serviço, não a manchete do dia.
 */
export const GABARITO_TEMPO = [
  "tempo agora", "tempo hoje", "proximos dias", "aviso meteorologico", "previsao",
  "pancada", "chuva", "chove", "vento", "rajada", "nebulosidade", "frente fria",
  "ressaca", "pluviom", "temperatura", "umidade", "geada", "vendaval", "tempestade",
  "granizo", "calor", "ceu ",
];

export const GABARITO_TRANSITO = [
  "atualizacao", "faixa", "interdi", "liberad", "transito", "brt",
  "calha", "engarrafamento", "retencao", "desvio", "bloqueio", "enguica",
  "avenida", "tunel", "elevado", "linha vermelha", "linha amarela", "ponte rio",
  "rodovia", "via expressa", "ciclovia",
];

/**
 * A abertura em caixa alta do título — o pedaço "gritado" que caracteriza
 * boletim. Ignora números, datas, emoji e o separador "|"; para na primeira
 * palavra com minúscula. Menos de duas palavras não é gabarito.
 */
export function aberturaDeBoletim(titulo: string): string | null {
  const abertura: string[] = [];
  for (const p of titulo.trim().split(/\s+/)) {
    // O indicador ordinal — "(1º/9)" — é letra para o Unicode, mas é data,
    // não palavra: sem tirá-lo, ele encerraria a abertura no meio.
    const letras = p.replace(/[ºª]/gu, "").replace(/[^\p{L}]/gu, "");
    if (letras.length === 0) continue; // "(31/8)", "|", emoji — não quebram a sequência
    if (letras.length < 2 || letras !== letras.toLocaleUpperCase("pt-BR")) break;
    abertura.push(letras);
  }
  return abertura.length >= 2 ? normalizar(abertura.join(" ")) : null;
}

/**
 * De que serviço é este boletim — ou null quando não é boletim.
 *
 * Um boletim que traz fato grave ("ACIDENTE COM FERIDOS", "DESABAMENTO")
 * não é gabarito: agrupá-lo com "FAIXA LIBERADA" e deixá-lo vencer em 48h
 * esconderia justamente o que a filial precisa ver.
 */
export function gabaritoOperacional(titulo: string): "tempo" | "transito" | null {
  const abertura = aberturaDeBoletim(titulo);
  if (!abertura) return null;
  if (bate(abertura, GRAVE)) return null;
  if (GABARITO_TEMPO.some((t) => abertura.includes(t))) return "tempo";
  if (GABARITO_TRANSITO.some((t) => abertura.includes(t))) return "transito";
  return null;
}

/**
 * O que anula um termo de urgência quando vem logo antes dele: "não há
 * previsão de temporal", "sem registro de alagamento". A janela é curta e
 * não atravessa ponto final — negação de uma frase não alcança a seguinte.
 */
const NEGACAO = new RegExp(
  [
    // "não há previsão de temporal", "nenhum registro de alagamento"
    String.raw`(?:\bnao (?:ha|havera|tem|houve|registra|preve)\b|\bnenhum[a]?\b|\bbaixa probabilidade de\b)[^.!?;\n]{0,40}$`,
    // "sem previsão de chuva forte", "sem registro de feridos" — e "sem feridos"
    String.raw`\bsem (?:(?:previsao|registro|registros|risco|ocorrencia|ocorrencias|casos|indicio|indicios|sinal|sinais)(?: de)? *)?$`,
  ].join("|"),
  "u",
);

/**
 * Cada lista é compilada uma vez: termos normalizados, sem duplicata
 * acentuada, com fronteira de palavra dos dois lados — e, à direita, só as
 * flexões do português entre o termo e a fronteira.
 *
 * É o que faz "chuva" achar "chuvas" e "desabrigad" achar "desabrigados"
 * (os radicais da lista contam com isso) sem que "mare" ache "maresia" nem
 * "posto" ache "postou". Antes disto, "niterói" e "niteroi" contavam duas
 * vezes, e "saúde mental" valia quatro hits de saúde: o termo virava peso,
 * não sinal.
 */
const FLEXAO = "(?:s|es|ns|is|a|as|o|os|e|ta|to|tas|tos|ado|ada|ados|adas|ido|ida|idos|idas|tado|tada|tados|tadas|cao|coes|mento|mentos|ando|endo|indo|r|ram|vam|va)?";
const compilados = new WeakMap<Termo[], RegExp[]>();

function compilar(termos: Termo[]): RegExp[] {
  const pronto = compilados.get(termos);
  if (pronto) return pronto;
  const vistos = new Set<string>();
  const lista: RegExp[] = [];
  for (const t of termos) {
    if (t instanceof RegExp) {
      const chave = `re:${t.source}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      lista.push(new RegExp(t.source, t.flags.includes("u") ? t.flags : `${t.flags}u`));
      continue;
    }
    const n = normalizar(t).trim();
    if (!n || vistos.has(n)) continue;
    vistos.add(n);
    lista.push(new RegExp(`(?<![\\p{L}\\p{N}])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${FLEXAO}(?![\\p{L}\\p{N}])`, "u"));
  }
  compilados.set(termos, lista);
  return lista;
}

/** Quantos termos distintos da lista aparecem no texto, sem contar os negados. */
export function conta(texto: string, termos: Termo[]): number {
  const t = normalizar(texto);
  let n = 0;
  for (const re of compilar(termos)) {
    const m = re.exec(t);
    if (!m) continue;
    if (NEGACAO.test(t.slice(Math.max(0, m.index - 48), m.index))) continue;
    n++;
  }
  return n;
}

export function bate(texto: string, termos: Termo[]): boolean {
  return conta(texto, termos) > 0;
}
