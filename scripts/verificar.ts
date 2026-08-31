/** Confere o motor de decisão contra casos concretos e contra o acervo real. */
import { decidir, ehSinal } from "../src/core/mente";
import { agrupar, familia } from "../src/core/agrupar";
import { direitoDe, podePublicar } from "../src/core/direito";
import { planoDeCanais } from "../src/core/canais";
import { errosParaSaude, postsParaItens } from "../src/apify/normalizar";
import { CONTAS, perfisInstagram } from "../src/core/contas";
import { AGENDA, CADENCIAS, JANELA, inputInstagram } from "../src/apify/input";
import type { Item } from "../src/core/tipos";
import { SEMENTE } from "../src/dados/acervo";

const ctx = { hoje: "2026-08-31" };
let falhas = 0;
function checar(nome: string, cond: boolean, extra = "") {
  console.log(`${cond ? "ok  " : "FALHA"} ${nome}${extra ? " — " + extra : ""}`);
  if (!cond) falhas++;
}

const base = (over: Partial<Item>): Item => ({
  id: "x", fonte: "t", plataforma: "instagram", tipo: "post_instagram",
  titulo: "", resumo: "", url: "", quando: new Date().toISOString(),
  rel: "media", grupo: "g", ...over,
});

// 1. Alerta de chuva da Defesa Civil do Rio → alta nota, urgente
const chuva = decidir(base({
  contaId: "defesacivil-rio", fonte: "Defesa Civil Municipal do Rio",
  titulo: "Sirenes acionadas em comunidades da Zona Norte do Rio",
  resumo: "Chuva forte, risco de deslizamento. Pontos de apoio abertos. Emergência no município do Rio de Janeiro.",
}), ctx);
checar("alerta de chuva local vira ação", chuva.total >= 70 && chuva.urgencia >= 60, `nota ${chuva.total}, urgência ${chuva.urgencia}`);

// 2. Fogo Cruzado → nunca vira conteúdo público, por mais urgente que seja
const tiroteio = decidir(base({
  contaId: "fogo-cruzado", fonte: "Fogo Cruzado RJ",
  titulo: "Tiroteio intenso agora na Maré, via bloqueada",
  resumo: "Operação policial em curso no Rio de Janeiro. Emergência, risco.",
}), ctx);
checar("fonte de uso interno nunca vira peça", tiroteio.veredito === "nao" && tiroteio.modo === "monitorar", `modo ${tiroteio.modo}`);
const canaisTiroteio = planoDeCanais(base({ contaId: "fogo-cruzado" }), tiroteio);
checar("uso interno: nenhum canal publica", canaisTiroteio.every((c) => !c.usar));

// 3. Peça velha da nacional → reprovada pelo filtro de data
const velha = decidir(base({
  contaId: "cvb", fonte: "Cruz Vermelha Brasileira",
  titulo: "#TBT relembre o ônibus da Cruz Vermelha em 2021",
  resumo: "Throwback: em 2021 a Cruz Vermelha levou saúde às comunidades.",
}), ctx);
checar("peça requentada é reprovada", velha.ineditismo <= 10 && velha.total <= 40, `ineditismo ${velha.ineditismo}, nota ${velha.total}`);

// 4. Notícia de saúde fora do RJ → não mexe no calendário
const fora = decidir(base({
  contaId: "fiocruz", fonte: "Fiocruz",
  titulo: "Vacinação ampliada em comunidades da Amazônia",
  resumo: "Ação de saúde coletiva amplia cobertura vacinal em municípios do Amazonas.",
}), ctx);
checar("saúde fora do RJ não vira pauta local", fora.total <= 45 && fora.localidade < 40, `nota ${fora.total}, localidade ${fora.localidade}`);

// 4b. Página raspada não é sinal — a armadilha do "ônibus de 2021"
const catalogo = base({
  contaId: "cvrj", fonte: "Cruz Vermelha RJ",
  titulo: "Suporte Básico de Vida Atendimento inicial de emergências. 4 horas. Saiba Mais",
  resumo: "", quando: "",
});
checar("catálogo de curso não é sinal", !ehSinal(catalogo));
checar("catálogo vai para arquivar", decidir(catalogo, ctx).modo === "arquivar");
const covid = base({
  contaId: "cvb", fonte: "Cruz Vermelha Brasileira",
  titulo: "Ônibus de vacinação da Cruz Vermelha contra a covid-19 chega a Fortaleza",
  resumo: "", quando: "",
});
checar("notícia sem data não vira pauta de hoje", decidir(covid, ctx).modo === "arquivar");
const comCorpo = base({
  contaId: "cvrj", fonte: "Cruz Vermelha RJ",
  titulo: "Filial abre turma de primeiros socorros na Escola",
  resumo: "A filial do Rio de Janeiro abre inscrições para a nova turma de suporte básico de vida, com aulas no centro.",
  quando: "2026-08-30T12:00:00Z",
});
checar("notícia com data e corpo continua sendo sinal", ehSinal(comCorpo));

// 5. Direito de imagem: nada além de `autorizado` pode publicar
for (const id of ["cvrj", "cbmerj", "cvb", "voz-comunidades"]) {
  const d = direitoDe(base({ contaId: id }));
  checar(`direito de ${id} não é publicável (${d})`, !podePublicar(d));
}
checar("apenas `autorizado` publica", podePublicar("autorizado") && !podePublicar("oficial"));

// 6. Normalização respeita a fronteira da lista fechada
const itens = postsParaItens([
  { id: "1", ownerUsername: "operacoesrio", caption: "Estágio de mobilização. Chuva forte.", url: "u1", timestamp: "2026-08-31T10:00:00Z", displayUrl: "i1" },
  { id: "2", ownerUsername: "conta_aleatoria_qualquer", caption: "Post de fora da lista", url: "u2" },
  { id: "3", ownerUsername: "cbmerj", caption: "Fixado institucional", url: "u3", isPinned: true },
  { id: "1", ownerUsername: "operacoesrio", caption: "duplicado", url: "u1", timestamp: "2026-08-31T10:00:00Z" },
]);
checar("só entra quem está na lista, sem fixado e sem duplicata", itens.length === 1 && itens[0].contaId === "cor-rio", `${itens.length} itens`);

// 6b. Registro de erro do actor vira saúde de fonte, não silêncio
const saude = errosParaSaude([
  { inputUrl: "https://www.instagram.com/defesacivilrj", error: "no_items" },
  { inputUrl: "https://www.instagram.com/handleinexistente", error: "not_found" },
  { id: "9", ownerUsername: "operacoesrio", caption: "post normal", url: "u" },
]);
checar("erro de perfil vira saúde de fonte", saude.length === 2, `${saude.length} registros`);
checar("bloqueio e handle errado são distinguidos",
  saude[0].detalhe.includes("bloqueou") && saude[1].detalhe.includes("não encontrado"));
checar("saúde de erro nomeia a conta quando ela existe na lista",
  saude[0].fonte.includes("Defesa Civil do Estado"));

// 6c. Boletins repetidos são agrupados, e a escalada continua aparecendo
const boletins = [
  { t: "TEMPO AGORA | CHUVA FRACA NO RIO (31/8/2026 - 04h20)", u: "Chuva fraca, sem risco." },
  { t: "TEMPO AGORA | CHUVA MODERADA NA SAÚDE (30/8/2026 - 23h20)", u: "Chuva moderada." },
  { t: "TEMPO AGORA | ESTÁGIO DE MOBILIZAÇÃO NO RIO (31/8/2026 - 06h)", u: "Emergência: chuva forte, risco de deslizamento e alagamento no Rio de Janeiro. Evacuação preventiva." },
].map((b, i) => base({ id: "b" + i, contaId: "cor-rio", fonte: "COR-Rio", titulo: b.t, resumo: b.u, quando: new Date().toISOString() }));

checar("boletins da mesma família compartilham assinatura",
  new Set(boletins.map((b) => familia(b))).size === 1, String(familia(boletins[0])));
// Aviso em caixa alta com números no meio é o mesmo gabarito.
const previsoes = [
  "SEGUNDA-FEIRA (31/8) COM POSSIBILIDADE DE PANCADAS DE CHUVA E VENTOS MODERADOS (31/08 - 11h21)",
  "SEGUNDA-FEIRA (31/8) COM PREVISÃO DE CHUVA FRACA A MODERADA | VENTOS PODEM SER COM RAJADAS",
  "SEGUNDA-FEIRA (31/8) COM PREVISÃO DE CHUVA FRACA ISOLADA DURANTE A MADRUGADA | VENTOS",
].map((t, i) => base({ id: "p" + i, contaId: "cor-rio", fonte: "COR-Rio", titulo: t, resumo: "previsão", quando: new Date().toISOString() }));
checar("avisos do mesmo gabarito agrupam mesmo sem o mesmo pipe",
  new Set(previsoes.map(familia)).size === 1, String(familia(previsoes[0])));
// Notícia em caixa normal NUNCA agrupa: esconder fato é pior que repetir boletim.
const noticias = [
  "Defesa Civil RJ realiza simulado para restabelecimento de comunicações críticas",
  "Defesa Civil RJ recebe representantes da Defesa Civil Nacional para agenda de inovação",
].map((t, i) => base({ id: "n" + i, contaId: "sedec-rj", fonte: "Defesa Civil do Estado (RJ)", titulo: t, resumo: "x".repeat(50), quando: new Date().toISOString() }));
checar("notícia em caixa normal não é agrupada", noticias.every((n) => familia(n) === null));
checar("duas notícias distintas seguem sendo duas",
  agrupar(noticias.map((i) => ({ item: i, score: decidir(i, ctx) }))).length === 2);
const grupos = agrupar(boletins.map((i) => ({ item: i, score: decidir(i, ctx) })));
checar("três boletins viram um item", grupos.length === 1, `${grupos.length} grupos`);
checar("dois foram recolhidos", grupos[0].semelhantes === 2);
checar("o boletim mais grave representa o grupo",
  grupos[0].item.titulo.includes("ESTÁGIO DE MOBILIZAÇÃO"), grupos[0].item.titulo.slice(0, 40));
checar("o agrupamento é explicado na decisão",
  grupos[0].score.porque.some((x) => x.includes("agrupa")));
const soltos = agrupar([{ item: base({ id: "s", contaId: "cvrj", fonte: "Cruz Vermelha RJ", titulo: "Filial abre turma nova de primeiros socorros na Escola do Rio", resumo: "x".repeat(50), quando: new Date().toISOString() }), score: decidir(base({}), ctx) }]);
checar("item único não é alterado pelo agrupamento", soltos.length === 1 && soltos[0].semelhantes === 0);

// 6d. Título de boletim longo é cortado; título curto fica inteiro
const [longo] = postsParaItens([{ id: "L", ownerUsername: "operacoesrio",
  caption: "TEMPO AGORA | CHUVA MODERADA NA ZONA OESTE DO RIO (31/08/2026 - 11H10) De acordo com o Sistema Alerta Rio, entre 10h45 e 11h, houve registro de chuva moderada na estação Santa Cruz (2,6 mm).",
  url: "u", timestamp: "2026-08-31T11:10:00Z" }]);
checar("título longo é cortado", longo.titulo.length <= 100 && longo.titulo.endsWith("…"), `${longo.titulo.length} chars`);
checar("título cortado não parte palavra", !/\s\S{1,3}…$/.test(longo.titulo), longo.titulo.slice(-28));
checar("resumo mantém a legenda inteira", longo.resumo.length > longo.titulo.length);
const [curto] = postsParaItens([{ id: "C", ownerUsername: "cbmerj",
  caption: "Bombeiros atendem ocorrência na Tijuca. Equipes seguem no local.", url: "u2", timestamp: "2026-08-31T09:00:00Z" }]);
checar("título curto fica inteiro", curto.titulo === "Bombeiros atendem ocorrência na Tijuca.", curto.titulo);

// 7. Input da Apify sai da lista, não da mão
const inp = inputInstagram("tempo_real");
checar("input tempo real tem perfis", inp.username.length > 0, `${inp.username.length} perfis`);
// Pedir handle inexistente gasta run e some da coleta em silêncio.
const semConfirmacao = CONTAS.filter((c) => c.instagramStatus === "ausente" || c.instagramStatus === "suspeito");
checar(
  "handle sem confirmação nunca entra no input",
  semConfirmacao.every((c) => !c.instagram || !perfisInstagram().includes(c.instagram.replace(/^@/, ""))),
  `${semConfirmacao.length} contas fora da coleta`,
);
checar("toda conta com Instagram declara o estado do handle",
  CONTAS.filter((c) => c.instagram).every((c) => Boolean(c.instagramStatus)));
checar("input filtra por data", Boolean(inp.onlyPostsNewerThan));
// Data relativa e não absoluta: o input fica guardado na Task agendada, e
// uma data fixa envelheceria ali dentro sem ninguém perceber.
checar("a janela é relativa, não uma data fixa",
  /^\d+ (days|months|years)$/.test(inp.onlyPostsNewerThan ?? ""), String(inp.onlyPostsNewerThan));
checar("toda cadência tem janela e agenda",
  CADENCIAS.every((c) => JANELA[c]?.apify && AGENDA[c]?.cron), `${CADENCIAS.length} cadências`);
checar("input pula fixados", inp.skipPinnedPosts === true);
checar("todo perfil do input está na lista", inp.username.every((u) => perfisInstagram().includes(u)));

// 8. O acervo semente inteiro passa pelo motor sem quebrar
const todos = SEMENTE.itens;
const notas = todos.map((i) => decidir(i, ctx));
checar("motor roda sobre todos os sinais da semente", notas.length === todos.length, `${notas.length} decididos`);
checar("toda decisão traz o porquê", notas.every((n) => n.porque.length > 0));
checar("toda nota fica entre 0 e 100", notas.every((n) => n.total >= 0 && n.total <= 100));
checkPlataforma();
function checkPlataforma() {
  checar("todo item da semente tem plataforma", todos.every((i) => Boolean(i.plataforma)));
}

const naoSinais = todos.filter((i) => !ehSinal(i)).length;
console.log(`\nnão-sinais barrados na semente: ${naoSinais}`);
const dist = notas.reduce<Record<string, number>>((a, n) => ({ ...a, [n.modo]: (a[n.modo] ?? 0) + 1 }), {});
console.log("\ndistribuição sobre o acervo real:", dist);
console.log(`contas na lista: ${CONTAS.length} · com Instagram: ${perfisInstagram().length}`);
console.log(falhas === 0 ? "\nTudo certo." : `\n${falhas} falha(s).`);
process.exit(falhas === 0 ? 0 : 1);
