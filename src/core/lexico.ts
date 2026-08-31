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

/** Quantos termos da lista aparecem no texto. */
export function conta(texto: string, termos: string[]): number {
  const t = normalizar(texto);
  return termos.filter((termo) => t.includes(normalizar(termo))).length;
}

export function bate(texto: string, termos: string[]): boolean {
  return conta(texto, termos) > 0;
}
