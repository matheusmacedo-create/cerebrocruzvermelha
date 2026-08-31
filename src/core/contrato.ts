/**
 * Versão do contrato entregue à Redação em /api/pauta.
 *
 * A Redação depende deste formato. Mudança que quebre consumidor sobe a
 * versão maior; campo novo e opcional sobe a menor.
 */
export const VERSAO_CONTRATO = "1.2";

/*
 * 1.1 — a mídia passa a vir como URL absoluta servida pelo Cérebro
 *       (`midia.url`), com a original da fonte em `midia.urlOriginal`, e cada
 *       pauta ganha `urlNoCerebro`. Campos novos e opcionais: quem consome a
 *       1.0 continua funcionando.
 * 1.2 — `midia.daCasa` diz se o material é da própria filial. Quem consome
 *       precisa disso para não tratar a foto da Casa como de terceiro.
 */
