import { test } from "node:test";
import assert from "node:assert/strict";
import type { Aceite, Item, Recusa } from "./tipos";
import { decidir, type ContextoDecisao } from "./mente";

/**
 * O motor, julgado pelos casos que importam para a filial. Todo teste fixa
 * `agora`: a idade de um sinal não pode depender do dia em que a suíte roda.
 */

const AGORA = "2026-09-04T12:00:00Z";
const HOJE = "2026-09-04";

function horasAtras(h: number): string {
  return new Date(Date.parse(AGORA) - h * 36e5).toISOString();
}
function diasAtras(d: number): string {
  return horasAtras(d * 24);
}

function item(dados: Partial<Item> & { titulo: string }): Item {
  return {
    id: dados.id ?? "abc123def456",
    fonte: dados.fonte ?? "COR-Rio — Centro de Operações e Resiliência",
    contaId: dados.contaId ?? "cor-rio",
    plataforma: dados.plataforma ?? "instagram",
    tipo: dados.tipo ?? "post_instagram",
    titulo: dados.titulo,
    resumo: dados.resumo ?? dados.titulo,
    url: "https://instagram.com/p/x",
    quando: dados.quando ?? horasAtras(2),
    rel: "media",
    grupo: dados.grupo ?? "rede",
    midia: dados.midia,
  };
}

const ctx = (extra: Partial<ContextoDecisao> = {}): ContextoDecisao => ({ hoje: HOJE, agora: AGORA, ...extra });

test("boletim rotineiro do COR-Rio não é agir agora", () => {
  const s = decidir(
    item({
      titulo: "TEMPO AGORA | Céu nublado com pancadas isoladas de chuva na Zona Norte",
      resumo: "TEMPO AGORA | Céu nublado com pancadas isoladas de chuva na Zona Norte. Sem previsão de chuva forte. Alerta Rio acompanha.",
    }),
    ctx(),
  );
  assert.notEqual(s.modo, "agir_agora");
  assert.ok(s.urgencia < 70, `urgência ${s.urgencia}`);
});

test("estágio 5 recente é agir agora mesmo com recusas antigas por repetição", () => {
  const recusados: Recusa[] = [1, 2, 3].map((n) => ({
    id: `rec${n}`,
    motivo: "repetitivo",
    titulo: `TEMPO AGORA | Boletim ${n}`,
    contaId: "cor-rio",
    fonte: "COR-Rio — Centro de Operações e Resiliência",
    quando: diasAtras(10 + n),
  }));
  const s = decidir(
    item({
      titulo: "ESTÁGIO 5 | Cidade do Rio em crise máxima após temporal",
      resumo: "ESTÁGIO 5 | Cidade do Rio em crise máxima após temporal. Deslizamentos, alagamentos e sirenes acionadas na Zona Norte. Evacuação de áreas de risco. Defesa Civil pede atenção.",
      quando: horasAtras(1),
    }),
    ctx({ recusados }),
  );
  assert.equal(s.modo, "agir_agora", s.porque.join(" | "));
  assert.ok(s.ineditismo >= 80, `ineditismo ${s.ineditismo}`);
});

test("recusas por repetição na família recuam o boletim de tempo de amanhã", () => {
  const recusados: Recusa[] = [1, 2, 3].map((n) => ({
    id: `rec${n}`,
    motivo: "repetitivo",
    titulo: `TEMPO AGORA | Boletim ${n}`,
    contaId: "cor-rio",
    fonte: "COR-Rio — Centro de Operações e Resiliência",
    quando: diasAtras(1),
  }));
  const s = decidir(item({ titulo: "TEMPO HOJE | Pancadas de chuva à tarde na cidade do Rio" }), ctx({ recusados }));
  assert.ok(s.ineditismo <= 20, `ineditismo ${s.ineditismo}`);
});

test("recusa esfria com o tempo", () => {
  const velha: Recusa[] = [{
    id: "rec1", motivo: "repetitivo", titulo: "TEMPO AGORA | Boletim", contaId: "cor-rio",
    fonte: "COR-Rio — Centro de Operações e Resiliência", quando: diasAtras(80),
  }];
  const s = decidir(item({ titulo: "TEMPO HOJE | Pancadas de chuva à tarde na cidade do Rio" }), ctx({ recusados: velha }));
  assert.ok(s.ineditismo >= 80, `ineditismo ${s.ineditismo}`);
});

test("sinal recusado é arquivado, e a mesma notícia por outro caminho também", () => {
  const recusados: Recusa[] = [{
    id: "outro", motivo: "sem_acao", titulo: "Defesa Civil RJ realiza simulado de evacuação em Petrópolis",
    contaId: "sedec-rj", fonte: "Defesa Civil do Estado (RJ)", quando: diasAtras(1),
  }];
  const direto = decidir(item({ id: "outro", titulo: "Qualquer coisa" }), ctx({ recusados }));
  assert.equal(direto.modo, "arquivar");
  const viaRSS = decidir(
    item({ id: "rss1", contaId: undefined, fonte: "Defesa Civil do Estado (RJ)", plataforma: "rss", titulo: "Defesa Civil RJ realiza simulado de evacuação em Petrópolis" }),
    ctx({ recusados }),
  );
  assert.equal(viaRSS.modo, "arquivar", viaRSS.porque.join(" | "));
});

test("sinal publicado pela Casa sai da atenção", () => {
  const aceites: Aceite[] = [{
    id: "pub1", evento: "publicado", titulo: "Cruz Vermelha RJ abre turma de primeiros socorros na Maré",
    contaId: "cvrj", fonte: "Cruz Vermelha RJ", quando: diasAtras(1), canais: ["site_web", "instagram"],
  }];
  const s = decidir(
    item({ id: "pub1", contaId: "cvrj", fonte: "Cruz Vermelha RJ", titulo: "Cruz Vermelha RJ abre turma de primeiros socorros na Maré" }),
    ctx({ aceites }),
  );
  assert.ok(s.total <= 25, `total ${s.total}`);
  assert.ok(s.porque.some((p) => p.includes("já publicou")));
});

test("a Casa publicou um boletim desta família há poucos dias: ineditismo cai", () => {
  const aceites: Aceite[] = [{
    id: "pub1", evento: "publicado", titulo: "TEMPO AGORA | Chuva forte na Zona Oeste",
    contaId: "cor-rio", fonte: "COR-Rio — Centro de Operações e Resiliência", quando: diasAtras(2),
  }];
  const s = decidir(item({ id: "novo1", titulo: "TEMPO HOJE | Pancadas de chuva à tarde" }), ctx({ aceites }));
  assert.ok(s.ineditismo <= 30, `ineditismo ${s.ineditismo}`);
});

test("ação da Casa exige duas palavras em comum, não uma", () => {
  const base = item({
    contaId: "sedec-rj", fonte: "Defesa Civil do Estado (RJ)",
    titulo: "Defesa Civil abre curso de brigadista em Nova Iguaçu",
  });
  const umaPalavra = decidir(base, ctx({ acoesDaCasa: ["Curso de violão na filial"] }));
  const duasPalavras = decidir(base, ctx({ acoesDaCasa: ["Curso de brigadista com a Defesa Civil"] }));
  assert.ok(umaPalavra.acaoReal < 60, `acaoReal ${umaPalavra.acaoReal}`);
  assert.ok(duasPalavras.acaoReal >= 90, `acaoReal ${duasPalavras.acaoReal}`);
});

test("a própria filial publicando é ação real e encosta no eixo", () => {
  const s = decidir(
    item({ contaId: "cvrj", fonte: "Cruz Vermelha RJ", titulo: "Voluntários da Cruz Vermelha RJ fazem mutirão de doação de sangue no Hemorio" }),
    ctx(),
  );
  assert.equal(s.acaoReal, 100);
  assert.ok(s.relacao >= 85);
  assert.ok(s.eixo, "eixo definido");
});

test("data no futuro não ganha bônus de frescor", () => {
  const futuro = decidir(item({ titulo: "Enchente e deslizamento na Baixada", quando: horasAtras(-48) }), ctx());
  const recente = decidir(item({ titulo: "Enchente e deslizamento na Baixada", quando: horasAtras(1) }), ctx());
  assert.ok(futuro.urgencia < recente.urgencia);
});

test("boletim de trânsito com mais de 48h vira histórico, mas fato grave não", () => {
  const velho = decidir(item({ titulo: "ATUALIZAÇÃO | FAIXA LIBERADA na Linha Amarela", quando: horasAtras(60) }), ctx());
  assert.ok(velho.total <= 30, `total ${velho.total}`);
  const grave = decidir(
    item({ titulo: "DESABAMENTO EM PETRÓPOLIS | Bombeiros resgatam feridos", resumo: "Desabamento em Petrópolis deixa feridos; bombeiros no local.", contaId: "cbmerj", fonte: "CBMERJ", quando: horasAtras(60) }),
    ctx(),
  );
  assert.ok(grave.total > 30, `total ${grave.total}: ${grave.porque.join(" | ")}`);
});

test("fonte de uso interno nunca vira peça", () => {
  const s = decidir(item({ contaId: "fogo-cruzado", fonte: "Fogo Cruzado", titulo: "Tiroteio na Maré com feridos" }), ctx());
  assert.equal(s.modo, "monitorar");
  assert.equal(s.veredito, "nao");
});
