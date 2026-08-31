/** Confere o motor de decisão contra casos concretos e contra o acervo real. */
import { decidir, ehSinal } from "../src/core/mente";
import { direitoDe, podePublicar } from "../src/core/direito";
import { planoDeCanais } from "../src/core/canais";
import { postsParaItens } from "../src/apify/normalizar";
import { CONTAS, perfisInstagram } from "../src/core/contas";
import { inputInstagram } from "../src/apify/input";
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

// 7. Input da Apify sai da lista, não da mão
const inp = inputInstagram("tempo_real");
checar("input tempo real tem perfis", inp.username.length >= 5, `${inp.username.length} perfis`);
checar("input filtra por data", Boolean(inp.onlyPostsNewerThan));
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
