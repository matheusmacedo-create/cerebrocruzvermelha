/**
 * Vocabulário do Cérebro.
 *
 * A regra que atravessa tudo: o Cérebro observa, entende e decide.
 * Ele não publica. Quem publica é a Redação, com decisão humana.
 */

/** Eixos temáticos da filial. Um sinal só interessa se encostar em algum deles. */
export type Eixo =
  | "grd" // gestão de risco de desastres
  | "saude"
  | "primeiros_socorros"
  | "voluntariado"
  | "institucional";

export const EIXOS: Record<Eixo, string> = {
  grd: "Gestão de risco e desastres",
  saude: "Saúde",
  primeiros_socorros: "Primeiros socorros",
  voluntariado: "Voluntariado",
  institucional: "Institucional",
};

/** Relação da conta/fonte com a Cruz Vermelha. Define o que pode ser reaproveitado. */
export type Vinculo =
  | "casa" // a própria filial RJ
  | "movimento" // CVB nacional, IFRC, CICV
  | "oficial" // órgão público (Defesa Civil, SMS, CBMERJ…)
  | "comunitario" // mídia de território
  | "monitor" // Fogo Cruzado, OTT
  | "servico"; // mobilidade e logística

/** Direito sobre a mídia do sinal. Só `autorizado` pode entrar numa peça da filial. */
export type Direito =
  | "autorizado" // material da Casa com autorização de imagem
  | "movimento" // material do movimento; conferir data antes
  | "oficial" // material de órgão público; crédito obrigatório, nunca reassinado
  | "terceiro" // material de terceiro; só contexto de triagem
  | "contexto" // referência de cena, não é registro real do fato
  | "stock"; // banco de imagem; proibido em peça de operação

/** O que o Cérebro recomenda fazer com o sinal. */
export type Modo =
  | "agir_agora"
  | "produzir"
  | "agendar"
  | "avaliar"
  | "monitorar"
  | "arquivar"
  | "folga_ou_plantao";

/** Veredito curto exibido no Jornal de triagem. */
export type Veredito = "sim" | "quase" | "nao" | "aprender";

export type Relevancia = "alta" | "media" | "baixa";

/** Canais que a Redação opera. */
export type Canal = "site" | "feed" | "stories" | "reels";

/** Plataformas que o Cérebro lê. */
export type Plataforma = "instagram" | "x" | "rss" | "api" | "html" | "calendario";

/** Uma conta da lista fechada. Nada entra no Cérebro fora desta lista. */
export interface Conta {
  id: string;
  nome: string;
  categoria: CategoriaConta;
  vinculo: Vinculo;
  eixos: Eixo[];
  instagram?: string;
  x?: string;
  /**
   * Estado do handle do Instagram, conferido contra a Apify.
   * `ausente` significa que a conta existe no X mas não foi possível
   * confirmar o Instagram — ela não entra na coleta até alguém confirmar.
   */
  instagramStatus?: "confirmado" | "bloqueado" | "ausente" | "suspeito";
  /** Frequência de coleta. Governa custo na Apify. */
  cadencia: "tempo_real" | "diario" | "3_dias" | "10_dias";
  /** Por que esta conta está na lista. Aparece na UI — a lista precisa se justificar. */
  porque: string;
  /** Regra dura específica desta conta, quando existe. */
  cuidado?: string;
}

export type CategoriaConta =
  | "emergencia"
  | "saude"
  | "territorio"
  | "seguranca"
  | "mobilidade"
  | "movimento";

/** Um sinal cru, já normalizado, venha de onde vier. */
export interface Item {
  id: string;
  fonte: string;
  /** Conta da lista fechada, quando o sinal veio de rede social. */
  contaId?: string;
  plataforma: Plataforma;
  tipo: string;
  titulo: string;
  resumo: string;
  url: string;
  /** ISO 8601 quando conhecido; senão o texto original da fonte. */
  quando: string;
  rel: Relevancia;
  grupo: string;
  /** Só em posts de rede social. */
  midia?: MidiaItem;
  metricas?: { curtidas?: number; comentarios?: number; visualizacoes?: number };
}

export interface MidiaItem {
  url: string;
  formato: "feed" | "reels" | "story" | "carrossel";
  tipo: "foto" | "video";
  direito: Direito;
  credito: string;
}

/** Uma peça sugerida — a saída do Cérebro para a Redação. */
export interface Proposta {
  id: string;
  data: string;
  dias: number;
  titulo: string;
  eixo: Eixo;
  tipo_data: string;
  status_data: string;
  modo: Modo;
  gancho: string;
  pecas: PecaSugerida[];
  proibido: string[];
  cta: string;
  fontes_ligadas: FonteLigada[];
  prioridade: string;
  /** Preenchido pelo motor quando a proposta nasce de um sinal e não de uma data. */
  score?: Score;
}

export interface PecaSugerida {
  quando: string;
  formato: string;
  peca: string;
}

export interface FonteLigada {
  titulo: string;
  fonte: string;
  url: string;
  score?: number;
}

export interface DataCalendario {
  data: string;
  weekday: string;
  titulo: string;
  tipo: string;
  eixo: Eixo | string;
  angulo: string;
  formatos: string[];
  preparar: string;
  status: string;
  dias: number;
  prioridade: string;
  url: string;
}

export interface SaudeFonte {
  fonte: string;
  ok: boolean;
  itens: number;
  detalhe: string;
  url: string;
}

/** As sete perguntas da Mente, com nota de 0 a 100. */
export interface Score {
  localidade: number;
  urgencia: number;
  relacao: number;
  acaoReal: number;
  ineditismo: number;
  confianca: number;
  total: number;
  modo: Modo;
  veredito: Veredito;
  /** Frases curtas que explicam a nota. A decisão precisa ser auditável. */
  porque: string[];
}

/** O acervo inteiro num snapshot. É o que a UI lê. */
export interface Acervo {
  hoje: string;
  gerado_em: string;
  metodo: string;
  origem: "apify" | "seed";
  totais: {
    itens: number;
    datas: number;
    propostas: number;
    fontes_ok: number;
    fontes: number;
    alta: number;
  };
  saude: SaudeFonte[];
  propostas: Proposta[];
  calendario: DataCalendario[];
  itens: Item[];
}
