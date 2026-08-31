/**
 * Coleta manual — para rodar fora da Vercel.
 *
 *   npm run coleta -- --cadencia tempo_real     dispara e espera a run
 *   npm run coleta:dry                          só imprime o input, não gasta Apify
 *
 * Precisa de APIFY_TOKEN e, para gravar o snapshot, APIFY_KV_STORE.
 */
import { ACTOR_INSTAGRAM, CHAVE_ACERVO, KV_STORE, gravarKV, lerDataset, lerKV, rodarActor, temToken } from "../src/apify/cliente";
import { inputInstagram, resumoDaLista, type Cadencia } from "../src/apify/input";
import { postsParaItens, type PostInstagram } from "../src/apify/normalizar";
import { montarAcervo } from "../src/dados/montar";
import type { Acervo } from "../src/core/tipos";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const cadencia = ((): Cadencia => {
  const i = args.indexOf("--cadencia");
  const v = i >= 0 ? args[i + 1] : "tempo_real";
  const validas: Cadencia[] = ["tempo_real", "diario", "3_dias", "10_dias"];
  if (!validas.includes(v as Cadencia)) {
    console.error(`cadência inválida: ${v}. Use uma de ${validas.join(", ")}`);
    process.exit(1);
  }
  return v as Cadencia;
})();

async function main() {
  const input = inputInstagram(cadencia);
  console.log(resumoDaLista());
  console.log(`\n── cadência ${cadencia} ──`);
  console.log(`${input.username.length} perfis, posts desde ${input.onlyPostsNewerThan}, teto ${input.resultsLimit}/perfil`);
  console.log(JSON.stringify(input, null, 2));

  if (dry) {
    console.log("\n--dry: nada foi enviado para a Apify.");
    return;
  }
  if (!temToken()) {
    console.error("\nAPIFY_TOKEN não configurado.");
    process.exit(1);
  }

  console.log(`\nDisparando ${ACTOR_INSTAGRAM}…`);
  const run = await rodarActor(ACTOR_INSTAGRAM, input);
  console.log(`run ${run.id} · dataset ${run.defaultDatasetId}`);
  console.log("A run é assíncrona. Em produção o webhook monta o snapshot.");

  if (!KV_STORE) {
    console.log("APIFY_KV_STORE não configurado — snapshot não será gravado.");
    return;
  }

  console.log("Aguardando o dataset encher…");
  const posts = await esperarDataset(run.defaultDatasetId);
  const novos = postsParaItens(posts);
  console.log(`${posts.length} posts lidos, ${novos.length} aceitos pela lista fechada.`);

  const base = (await lerKV<Omit<Acervo, "origem">>(KV_STORE, CHAVE_ACERVO)) ?? undefined;
  const snapshot = montarAcervo({ novos, base });
  await gravarKV(KV_STORE, CHAVE_ACERVO, snapshot);
  console.log(`Snapshot gravado: ${snapshot.totais.itens} sinais, ${snapshot.totais.alta} de relevância alta.`);
}

/** A run é assíncrona; sondamos o dataset até parar de crescer. */
async function esperarDataset(datasetId: string, tentativas = 20): Promise<PostInstagram[]> {
  let anterior = -1;
  for (let i = 0; i < tentativas; i++) {
    await new Promise((r) => setTimeout(r, 15_000));
    const posts = await lerDataset<PostInstagram>(datasetId, 2000);
    if (posts.length > 0 && posts.length === anterior) return posts;
    anterior = posts.length;
    console.log(`  … ${posts.length} posts`);
  }
  return lerDataset<PostInstagram>(datasetId, 2000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
