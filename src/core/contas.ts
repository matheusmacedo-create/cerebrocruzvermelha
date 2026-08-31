import type { Conta } from "./tipos";

/**
 * A LISTA FECHADA.
 *
 * O Cérebro não lê a internet. Ele lê estas contas.
 * Entrar aqui é decisão humana e cada linha carrega o motivo de estar aqui.
 * Sair daqui também é decisão humana.
 *
 * Cadência governa custo na Apify: `tempo_real` roda de hora em hora,
 * `diario` uma vez por dia, e assim por diante.
 */
export const CONTAS: Conta[] = [
  // ─── 1. Emergência, clima e Defesa Civil ────────────────────────────────
  {
    id: "cor-rio",
    nome: "COR-Rio — Centro de Operações e Resiliência",
    categoria: "emergencia",
    vinculo: "oficial",
    eixos: ["grd"],
    instagram: "@operacoesrio",
    instagramStatus: "confirmado",
    x: "@OperacoesRio",
    cadencia: "tempo_real",
    porque: "Canal mais rápido do Rio para mudança de estágio da cidade, bolsões d'água e interdições.",
    cuidado: "@alerta.rio no Instagram é página de mídia, não é o sistema Alerta Rio. Não confundir.",
  },
  {
    id: "alerta-rio",
    nome: "Sistema Alerta Rio — meteorologia da Prefeitura",
    categoria: "emergencia",
    vinculo: "oficial",
    eixos: ["grd"],
    instagram: "@sistemaalertario",
    instagramStatus: "confirmado",
    x: "@sistemaalertario",
    cadencia: "tempo_real",
    porque: "Dados telemétricos, chuva por bairro e ventos fortes. É quem eleva o estágio.",
  },
  {
    id: "defesacivil-rio",
    nome: "Defesa Civil Municipal do Rio",
    categoria: "emergencia",
    vinculo: "oficial",
    eixos: ["grd"],
    instagram: "@defesacivil_rio",
    instagramStatus: "confirmado",
    x: "@defesacivil_rio",
    cadencia: "tempo_real",
    porque: "Acionamento de sirenes em comunidades e abertura de pontos de apoio.",
    cuidado: "Sirene acionada é gatilho de plantão, não de post. Confirmar no registrar antes de qualquer peça.",
  },
  {
    id: "sedec-rj",
    nome: "Defesa Civil do Estado do RJ (SEDEC-RJ)",
    categoria: "emergencia",
    vinculo: "oficial",
    eixos: ["grd"],
    instagram: "@defesacivil_rj",
    instagramStatus: "confirmado",
    x: "@DefesaCivilRJ",
    cadencia: "diario",
    porque: "Alertas para os 92 municípios fluminenses e simulados.",
    cuidado: "A Cruz não assina o sistema de alerta do Estado. Entra como tradutora, com crédito.",
  },
  {
    id: "cbmerj",
    nome: "Corpo de Bombeiros Militar do RJ (CBMERJ)",
    categoria: "emergencia",
    vinculo: "oficial",
    eixos: ["grd", "primeiros_socorros"],
    instagram: "@corpodebombeiros_rj",
    instagramStatus: "confirmado",
    x: "@cbmerj_oficial",
    cadencia: "diario",
    porque: "Operações de resgate de grande porte, desabamentos e incêndios.",
    cuidado: "Balanço de ocorrências é número deles. Copiar no feed da filial é assinar operação alheia.",
  },
  {
    id: "inea",
    nome: "INEA — Instituto Estadual do Ambiente",
    categoria: "emergencia",
    vinculo: "oficial",
    eixos: ["grd"],
    instagram: undefined,
    instagramStatus: "ausente",
    x: "@inea_rj",
    cadencia: "diario",
    porque: "Níveis de rios e risco de transbordamento no estado. Antecede enchente na Baixada.",
  },

  // ─── 2. Saúde pública, epidemiologia e sangue ───────────────────────────
  {
    id: "sms-rio",
    nome: "Secretaria Municipal de Saúde do Rio",
    categoria: "saude",
    vinculo: "oficial",
    eixos: ["saude"],
    instagram: "@saude_rio",
    instagramStatus: "confirmado",
    x: "@saudeprefrio",
    cadencia: "3_dias",
    porque: "Campanhas de vacinação, funcionamento de postos e boletins locais.",
    cuidado: "A filial não é vigilância epidemiológica. Não replicar desmentido sem demanda local.",
  },
  {
    id: "ses-rj",
    nome: "Secretaria de Estado de Saúde do RJ",
    categoria: "saude",
    vinculo: "oficial",
    eixos: ["saude"],
    instagram: "@saudegovrj",
    instagramStatus: "confirmado",
    x: "@SaudeGovRJ",
    cadencia: "3_dias",
    porque: "Situação dos hospitais estaduais e boletins epidemiológicos.",
  },
  {
    id: "hemorio",
    nome: "Hemorio — Rede Estadual de Hematologia",
    categoria: "saude",
    vinculo: "oficial",
    eixos: ["saude", "voluntariado"],
    instagram: "@hemorio",
    instagramStatus: "confirmado",
    x: "@HEMORIO",
    cadencia: "diario",
    porque: "Nível dos estoques de sangue. Estoque crítico é o gatilho de pauta de doação — nunca o contrário.",
    cuidado: "Só chamar doação quando o Hemorio pedir. Campanha de sangue fora de hora esvazia a próxima.",
  },
  {
    id: "fiocruz",
    nome: "Fiocruz — Fundação Oswaldo Cruz",
    categoria: "saude",
    vinculo: "oficial",
    eixos: ["saude"],
    instagram: "@fiocruz",
    instagramStatus: "confirmado",
    x: "@fiocruz",
    cadencia: "3_dias",
    porque: "Notas técnicas sobre vacinas, arboviroses e saúde coletiva. Fonte para não errar o fato.",
  },

  // ─── 3. Mídia comunitária e território ──────────────────────────────────
  {
    id: "voz-comunidades",
    nome: "Voz das Comunidades",
    categoria: "territorio",
    vinculo: "comunitario",
    eixos: ["grd", "saude"],
    instagram: "@vozdascomunidades",
    instagramStatus: "confirmado",
    x: "@vozdacomunidade",
    cadencia: "tempo_real",
    porque: "Registra primeiro o impacto de chuva, falta de luz e água no Alemão e em favelas do Rio.",
    cuidado: "Mídia de terceiro. Serve para saber onde ir, nunca para ilustrar post da Cruz.",
  },
  {
    id: "mare-noticias",
    nome: "Maré de Notícias",
    categoria: "territorio",
    vinculo: "comunitario",
    eixos: ["grd", "saude"],
    instagram: "@redesdamare",
    instagramStatus: "confirmado",
    x: "@mare_noticias",
    cadencia: "diario",
    porque: "Complexo da Maré. Território de operação recorrente da filial.",
  },
  {
    id: "fala-roca",
    nome: "Fala Roça",
    categoria: "territorio",
    vinculo: "comunitario",
    eixos: ["grd", "saude"],
    instagram: "@falaroca",
    instagramStatus: "confirmado",
    x: "@falaroca",
    cadencia: "diario",
    porque: "Rocinha. Chuva forte na Zona Sul aparece aqui antes do boletim.",
  },
  {
    id: "agencia-lume",
    nome: "Agência Lume",
    categoria: "territorio",
    vinculo: "comunitario",
    eixos: ["grd", "saude"],
    instagram: "@agencialume",
    instagramStatus: "confirmado",
    cadencia: "diario",
    porque: "Baixada Fluminense: desastre climático, saúde e direitos humanos.",
  },
  {
    id: "labjaca",
    nome: "LabJaca",
    categoria: "territorio",
    vinculo: "comunitario",
    eixos: ["grd", "saude"],
    instagram: "@labjaca",
    instagramStatus: "confirmado",
    cadencia: "3_dias",
    porque: "Dados e relatórios sobre saneamento e crise climática nas periferias. Vira base de matéria, não de post rápido.",
  },

  // ─── 4. Segurança operacional ───────────────────────────────────────────
  {
    id: "fogo-cruzado",
    nome: "Fogo Cruzado RJ",
    categoria: "seguranca",
    vinculo: "monitor",
    eixos: ["grd"],
    instagram: undefined,
    instagramStatus: "ausente",
    x: "@FogoCruzadoRJ",
    cadencia: "tempo_real",
    porque: "Disparos e operações policiais. Vital para a segurança das equipes de campo.",
    cuidado: "USO INTERNO. Nunca vira conteúdo público da filial. Alimenta decisão de deslocamento, não o feed.",
  },
  {
    id: "ott-rio",
    nome: "Onde Tem Tiroteio (OTT)",
    categoria: "seguranca",
    vinculo: "monitor",
    eixos: ["grd"],
    instagram: undefined,
    instagramStatus: "ausente",
    x: "@ott_rio",
    cadencia: "tempo_real",
    porque: "Alertas em tempo real de tiroteio, arrastão e vias bloqueadas.",
    cuidado: "USO INTERNO. Informação não verificada oficialmente. Não é fonte para peça pública.",
  },

  // ─── 5. Mobilidade e logística ──────────────────────────────────────────
  {
    id: "metrorio",
    nome: "MetrôRio",
    categoria: "mobilidade",
    vinculo: "servico",
    eixos: ["grd"],
    instagram: "@metro_rio",
    instagramStatus: "confirmado",
    x: "@MetroRio",
    cadencia: "diario",
    porque: "Principal eixo de transporte da capital. Define se voluntário e doação chegam.",
    cuidado: "USO INTERNO logístico. Só vira conteúdo se afetar um evento da Casa.",
  },
  {
    id: "supervia",
    nome: "SuperVia Trens Urbanos",
    categoria: "mobilidade",
    vinculo: "servico",
    eixos: ["grd"],
    instagram: undefined,
    instagramStatus: "ausente",
    x: "@SuperVia_trens",
    cadencia: "diario",
    porque: "Ramais da Baixada e Zonas Norte e Oeste. Onde mora a maior parte do voluntariado.",
  },
  {
    id: "ccr-barcas",
    nome: "CCR Barcas",
    categoria: "mobilidade",
    vinculo: "servico",
    eixos: ["grd"],
    instagram: undefined,
    instagramStatus: "ausente",
    x: "@CCRBarcas",
    cadencia: "diario",
    porque: "Ligação Praça XV–Niterói e Paquetá. Paquetá é área isolada em emergência.",
  },

  // ─── 6. A Casa e o Movimento ────────────────────────────────────────────
  {
    id: "cvrj",
    nome: "Cruz Vermelha Brasileira — Filial RJ",
    categoria: "movimento",
    vinculo: "casa",
    eixos: ["institucional", "primeiros_socorros", "voluntariado", "grd", "saude"],
    instagram: "@cruzvermelhabrasileirarj",
    instagramStatus: "confirmado",
    cadencia: "diario",
    porque: "A própria Casa. Memória do que já foi publicado — impede repetir gancho e ensina o que performou.",
  },
  {
    id: "cvb",
    nome: "Cruz Vermelha Brasileira — nacional",
    categoria: "movimento",
    vinculo: "movimento",
    eixos: ["institucional", "grd", "saude"],
    instagram: "@cruzvermelhabrasileira",
    instagramStatus: "confirmado",
    cadencia: "3_dias",
    porque: "Movimento nacional. Está na lista também para o Cérebro aprender a recusar peça velha.",
    cuidado: "FILTRO DE DATA OBRIGATÓRIO. Repost antigo sem data explícita não entra.",
  },
  {
    id: "ifrc",
    nome: "IFRC — Federação Internacional",
    categoria: "movimento",
    vinculo: "movimento",
    eixos: ["institucional", "grd"],
    instagram: "@ifrc",
    instagramStatus: "confirmado",
    cadencia: "10_dias",
    porque: "Movimento global. Só entra se citar Brasil ou se for data oficial do movimento.",
  },
];

export const CONTAS_POR_ID = new Map(CONTAS.map((c) => [c.id, c]));

export const CATEGORIAS: Record<string, { rotulo: string; descricao: string }> = {
  emergencia: { rotulo: "Emergência e clima", descricao: "Defesa Civil, bombeiros, meteorologia. Resposta imediata." },
  saude: { rotulo: "Saúde e sangue", descricao: "Vigilância, hospitais, estoque de sangue." },
  territorio: { rotulo: "Território", descricao: "Mídia comunitária. O impacto aparece aqui primeiro." },
  seguranca: { rotulo: "Segurança operacional", descricao: "Uso interno. Protege a equipe de campo." },
  mobilidade: { rotulo: "Mobilidade", descricao: "Uso interno. Voluntário e doação chegam ou não chegam." },
  movimento: { rotulo: "Casa e movimento", descricao: "A filial, a nacional e a Federação." },
};

/** Contas cujo conteúdo nunca vira peça pública — só alimentam decisão interna. */
export const SOMENTE_INTERNO = new Set(["fogo-cruzado", "ott-rio", "metrorio", "supervia", "ccr-barcas"]);

/**
 * Handles do Instagram sem o @, no formato que a Apify espera.
 *
 * Só devolve handle confirmado contra a Apify. Pedir um handle inexistente
 * gasta run e, pior, some da coleta em silêncio — a fonte simplesmente para
 * de aparecer sem ninguém notar. Contas `ausente` ficam de fora até alguém
 * confirmar o handle; `bloqueado` continua sendo pedido, porque o handle
 * existe e o bloqueio do Instagram é intermitente.
 */
export function perfisInstagram(filtro?: (c: Conta) => boolean): string[] {
  return CONTAS.filter(
    (c) => c.instagram && c.instagramStatus !== "ausente" && c.instagramStatus !== "suspeito" && (filtro ? filtro(c) : true),
  ).map((c) => c.instagram!.replace(/^@/, ""));
}

/** Contas cujo Instagram ainda não foi confirmado. Aparecem na tela de Fontes. */
export function contasSemInstagram(): Conta[] {
  return CONTAS.filter((c) => c.instagramStatus === "ausente" || c.instagramStatus === "suspeito");
}

export function perfisX(filtro?: (c: Conta) => boolean): string[] {
  return CONTAS.filter((c) => c.x && (filtro ? filtro(c) : true)).map((c) => c.x!.replace(/^@/, ""));
}

export function contaPorHandle(handle: string): Conta | undefined {
  const h = handle.replace(/^@/, "").toLowerCase();
  return CONTAS.find((c) => c.instagram?.replace(/^@/, "").toLowerCase() === h || c.x?.replace(/^@/, "").toLowerCase() === h);
}

/**
 * Ponte entre as fontes documentais (RSS, API, diário oficial) e a lista fechada.
 *
 * A mesma instituição chega por dois caminhos: o feed do Instagram e o RSS
 * institucional. Ela é a mesma fonte nos dois — a Defesa Civil não é menos
 * confiável por ter chegado via RSS. Sem esta ponte o motor trata todo sinal
 * documental como fonte desconhecida.
 */
const FONTE_PARA_CONTA: [RegExp, string][] = [
  [/defesa civil do estado|sedec/i, "sedec-rj"],
  [/defesa civil.*(rio|munic)/i, "defesacivil-rio"],
  [/alerta ?rio/i, "alerta-rio"],
  [/bombeiros|cbmerj/i, "cbmerj"],
  [/\binea\b/i, "inea"],
  [/cor-rio|opera[cç][oõ]es ?rio/i, "cor-rio"],
  [/hemorio/i, "hemorio"],
  [/fiocruz/i, "fiocruz"],
  [/sms-rio|secretaria municipal de sa[uú]de/i, "sms-rio"],
  [/ses-rj|secretaria de estado de sa[uú]de/i, "ses-rj"],
  [/cruz vermelha rj|filial rj/i, "cvrj"],
  [/cruz vermelha brasileira/i, "cvb"],
  [/\bifrc\b|federa[cç][aã]o internacional/i, "ifrc"],
];

/**
 * Descobre a conta de um item. Usa o vínculo explícito quando existe e, na
 * falta dele, tenta reconhecer a instituição pelo nome da fonte documental.
 * Devolve undefined para fontes fora da lista — INMET, Agência Brasil e os
 * diários oficiais são fontes de fato, não contas monitoradas.
 */
export function resolverConta(item: { contaId?: string; fonte: string }): Conta | undefined {
  if (item.contaId) return CONTAS_POR_ID.get(item.contaId);
  for (const [padrao, id] of FONTE_PARA_CONTA) {
    if (padrao.test(item.fonte)) return CONTAS_POR_ID.get(id);
  }
  return undefined;
}
