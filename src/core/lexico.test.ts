import { test } from "node:test";
import assert from "node:assert/strict";
import { EIXO_TERMOS, GRAVE, RJ, URGENTE, bate, conta, gabaritoOperacional } from "./lexico";

/**
 * Os casos que fizeram o motor errar em produção. Cada um é uma frase que
 * apareceu de verdade num boletim — e a asserção diz o que o Cérebro deveria
 * ter entendido dela.
 */

test("variantes acentuadas do mesmo termo contam uma vez", () => {
  assert.equal(conta("Alagamento em Niterói. Niteroi tem pontos de apoio.", RJ), 1);
});

test("expressão composta não soma as partes", () => {
  // "saúde mental" contava 4: saúde, saude, saúde mental, saude mental.
  assert.equal(conta("Roda de conversa sobre saúde mental", ["saúde", "saude", "saúde mental", "saude mental"]), 2);
});

test("substring de outra palavra não é termo", () => {
  assert.equal(conta("O cenário ideal para a maresia", ["dea", "mare"]), 0);
});

test("radical alcança o plural e a flexão", () => {
  assert.equal(conta("Chuvas fortes deixam desabrigados", ["chuva", "desabrigad"]), 2);
});

test("negação anula o termo de urgência", () => {
  assert.equal(conta("Não há previsão de temporal para hoje", URGENTE), 0);
  assert.equal(conta("Sem registro de alagamentos na cidade", URGENTE), 0);
  assert.equal(conta("Colisão sem feridos na Linha Amarela", URGENTE), 0);
});

test("negação não atravessa a frase", () => {
  assert.equal(conta("Não há previsão de chuva. Deslizamento interdita a via.", URGENTE), 2);
});

test("negação só vale para a linguagem de emergência", () => {
  // "Não há feridos em Petrópolis" nega os feridos, não Petrópolis.
  assert.equal(conta("Não há feridos em Petrópolis após deslizamento", RJ), 1);
  assert.equal(conta("Não há novos casos de dengue no Rio de Janeiro", EIXO_TERMOS.saude), 1);
  assert.equal(conta("Não há feridos em Petrópolis após deslizamento", GRAVE), 0);
});

test("adversativa e dois-pontos encerram a negação; a lista negada não", () => {
  assert.equal(conta("Não há feridos, mas há desabrigados", GRAVE), 1);
  assert.equal(conta("Não tem como sair: moradores ilhados na Baixada", URGENTE), 1);
  assert.equal(conta("Não há registro de alagamentos, deslizamentos ou quedas de árvore", URGENTE), 0);
});

test("uma ocorrência afirmada basta, mesmo depois de uma negada", () => {
  assert.equal(conta("Não há feridos em Copacabana. Feridos em Botafogo.", GRAVE), 1);
});

test("primeiros socorros não é pedido de socorro", () => {
  assert.equal(conta("Curso de Primeiros Socorros para professores", URGENTE), 0);
  assert.equal(conta("Pedido de socorro: moradores ilhados", URGENTE), 2);
});

test("radicais alcançam a derivação longa", () => {
  assert.equal(conta("Soterramento em Petrópolis; via interditada", URGENTE), 2);
  assert.equal(conta("Cenário epidemiológico da dengue", EIXO_TERMOS.saude), 2);
});

test("boletim rotineiro de tempo não tem linguagem de emergência", () => {
  assert.equal(conta("TEMPO AGORA | Céu nublado com pancadas isoladas de chuva. Alerta Rio acompanha.", URGENTE), 0);
});

test("estágio só conta do 3 para cima", () => {
  assert.equal(conta("Cidade entra em Estágio 1 (normalidade)", URGENTE), 0);
  assert.equal(conta("Cidade entra em Estágio 3 por causa da chuva forte", URGENTE), 1);
  assert.equal(conta("ESTÁGIO 5 | Crise máxima", URGENTE), 1);
});

test("gabarito de tempo e de trânsito", () => {
  assert.equal(gabaritoOperacional("TEMPO AGORA | Céu encoberto na Zona Norte"), "tempo");
  assert.equal(gabaritoOperacional("NOITE DE TERÇA (1º/9) COM PANCADAS de chuva"), "tempo");
  assert.equal(gabaritoOperacional("ATUALIZAÇÃO | FAIXA LIBERADA na Linha Amarela"), "transito");
  assert.equal(gabaritoOperacional("Defesa Civil RJ realiza simulado em Petrópolis"), null);
});

test("fato grave não é gabarito, mesmo em caixa alta", () => {
  assert.equal(gabaritoOperacional("ACIDENTE COM FERIDOS NA LINHA VERMELHA | Faixa interditada"), null);
  assert.equal(gabaritoOperacional("DESABAMENTO EM PETRÓPOLIS | Bombeiros no local"), null);
  // O dígito é o que faz o estágio ser grave — e ele só existe no título inteiro.
  assert.equal(gabaritoOperacional("TEMPO AGORA | ESTÁGIO 5 NO RIO (4/9/2026 - 06h)"), null);
  assert.equal(gabaritoOperacional("ATUALIZAÇÃO | ACIDENTE COM VÍTIMAS NA LINHA VERMELHA"), null);
  assert.equal(gabaritoOperacional("ATUALIZAÇÃO | ACIDENTE SEM VÍTIMAS NA LINHA VERMELHA"), "transito");
});

test("bate é conta > 0", () => {
  assert.equal(bate("Enchente na Baixada", URGENTE), true);
  assert.equal(bate("Aula de violão", URGENTE), false);
});
