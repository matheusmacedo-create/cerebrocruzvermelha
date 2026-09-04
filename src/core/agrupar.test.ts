import { test } from "node:test";
import assert from "node:assert/strict";
import type { Item, Score } from "./tipos";
import { agrupar, assinatura, diversificar, mesmaNoticia } from "./agrupar";

function item(id: string, titulo: string, contaId?: string, fonte = "COR-Rio — Centro de Operações"): Item {
  return { id, fonte, contaId, plataforma: "instagram", tipo: "post_instagram", titulo, resumo: `${titulo}.`, url: `https://x/${id}`, quando: "2026-09-04T10:00:00Z", rel: "media", grupo: "rede" };
}

function score(total: number): Score {
  return { localidade: 80, urgencia: 20, relacao: 60, acaoReal: 12, ineditismo: 85, confianca: 95, total, modo: "agendar", veredito: "quase", porque: [] };
}

test("boletins de tempo da mesma conta têm a mesma assinatura", () => {
  const a = assinatura(item("a", "TEMPO AGORA | Céu nublado", "cor-rio"));
  const b = assinatura(item("b", "NOITE DE TERÇA (1º/9) COM PANCADAS de chuva", "cor-rio"));
  assert.equal(a, "cor-rio::tempo");
  assert.equal(a, b);
});

test("a escalada de estágio não entra na família do boletim de tempo", () => {
  const rotina = assinatura(item("a", "TEMPO AGORA | Céu nublado", "cor-rio"));
  const escalada = assinatura(item("b", "ESTÁGIO 5 | Cidade em crise máxima", "cor-rio"));
  assert.notEqual(rotina, escalada);
});

test("estágio 2 e estágio 3 são notícias diferentes", () => {
  const a = mesmaNoticia(item("a", "Cidade do Rio entra em estágio 2 de mobilização"));
  const b = mesmaNoticia(item("b", "Cidade do Rio entra em estágio 3 de mobilização"));
  assert.ok(a && b);
  assert.notEqual(a, b);
});

test("a mesma nota por dois caminhos tem a mesma assinatura", () => {
  const rss = assinatura({ titulo: "Defesa Civil RJ realiza simulado de evacuação em Petrópolis", fonte: "Defesa Civil do Estado (RJ)" });
  const insta = assinatura(item("b", "Defesa Civil RJ realiza simulado de evacuação em Petrópolis", "sedec-rj"));
  assert.equal(rss, insta);
});

test("agrupar elege o de maior nota e é estável", () => {
  const grupo = agrupar([
    { item: item("a", "TEMPO AGORA | Céu nublado", "cor-rio"), score: score(40) },
    { item: item("b", "TEMPO AGORA | Chuva forte", "cor-rio"), score: score(61) },
    { item: item("c", "TEMPO HOJE | Pancadas", "cor-rio"), score: score(40) },
  ]);
  assert.equal(grupo.length, 1);
  assert.equal(grupo[0].item.id, "b");
  assert.equal(grupo[0].semelhantes, 2);
});

test("diversificar só rebaixa o que está abaixo da nota mínima", () => {
  const lista = agrupar([
    { item: item("a", "Simulado em Petrópolis", "sedec-rj", "Defesa Civil do Estado (RJ)"), score: score(70) },
    { item: item("b", "Sirenes testadas na Serra", "sedec-rj", "Defesa Civil do Estado (RJ)"), score: score(66) },
    { item: item("c", "Curso de brigadista abre turma", "sedec-rj", "Defesa Civil do Estado (RJ)"), score: score(63) },
    { item: item("d", "Aula de violão na Maré", "mare-noticias", "Maré de Notícias"), score: score(32) },
    { item: item("e", "Feira de artesanato", "sedec-rj", "Defesa Civil do Estado (RJ)"), score: score(30) },
  ]);
  const ordem = diversificar(lista).map((a) => a.item.id);
  // A terceira notícia boa da Defesa Civil (63) fica antes do item de 32;
  // a de 30 é a que cede a vaga.
  assert.deepEqual(ordem, ["a", "b", "c", "d", "e"]);
});
