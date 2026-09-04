/**
 * Versão do contrato entregue à Redação em /api/pauta.
 *
 * A Redação depende deste formato. Mudança que quebre consumidor sobe a
 * versão maior; campo novo e opcional sobe a menor.
 */
export const VERSAO_CONTRATO = "1.3";

/*
 * 1.1 — a mídia passa a vir como URL absoluta servida pelo Cérebro
 *       (`midia.url`), com a original da fonte em `midia.urlOriginal`, e cada
 *       pauta ganha `urlNoCerebro`. Campos novos e opcionais: quem consome a
 *       1.0 continua funcionando.
 * 1.2 — `midia.daCasa` diz se o material é da própria filial. Quem consome
 *       precisa disso para não tratar a foto da Casa como de terceiro.
 * 1.3 — `decisao.eixo`/`decisao.eixoRotulo` (a editoria em que o sinal
 *       encosta); `naRedacao` (o que a Redação já fez com o sinal: pautado,
 *       publicado, pacote, URL) — alimentado pelos eventos que ela devolve em
 *       POST /api/feedback `{ id, evento: "pautado" | "publicado" }`;
 *       `midia.direito` ganha o valor "casa" (foto da filial ainda sem termo
 *       de imagem confirmado); `?id=` aceita o id de um boletim recolhido e
 *       devolve o chefe da família; `?modo=` aceita lista ("a,b") e "todos".
 *       Tudo aditivo: quem consome a 1.2 continua funcionando.
 */
