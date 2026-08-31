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
import { perfisBloqueados, postsParaItens, saudeDaColeta, type PostInstagram } from "../src/apify/normalizar";
import { montarAcervo } from "../src/dados/montar";
import { chavesGuardadas, guardarMidias, podarMidia } from "../src/apify/midia";
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
  let posts = await esperarDataset(run.defaultDatasetId);

  // Mesma regra do webhook: bloqueio do Instagram é intermitente e o perfil
  // bloqueado não é cobrado, então uma retentativa sai de graça.
  const bloqueados = perfisBloqueados(posts);
  if (bloqueados.length > 0) {
    console.log(`\n${bloqueados.length} perfil(is) bloqueado(s): ${bloqueados.join(", ")}. Retentando uma vez…`);
    const r2 = await rodarActor(ACTOR_INSTAGRAM, {
      username: bloqueados, resultsLimit: 8, skipPinnedPosts: true, onlyPostsNewerThan: "2 days",
    });
    const extras = await esperarDataset(r2.defaultDatasetId);
    const ganhos = extras.filter((p) => p.ownerUsername).length;
    console.log(`  a retentativa trouxe ${ganhos} post(s).`);
    posts = [...posts, ...extras];
  }
  const novos = postsParaItens(posts);
  console.log(`${posts.length} posts lidos, ${novos.length} aceitos pela lista fechada.`);

  const base = (await lerKV<Omit<Acervo, "origem">>(KV_STORE, CHAVE_ACERVO, true)) ?? undefined;
  // Mesma regra do webhook: perfil que falhou vira saúde de fonte visível.
  const saudeColeta = saudeDaColeta(posts);
  const falhas = saudeColeta.filter((s) => !s.ok);
  const snapshot = montarAcervo({ novos, base, saudeColeta });
  for (const f of falhas) console.log(`  ! ${f.fonte}: ${f.detalhe}`);
  await gravarKV(KV_STORE, CHAVE_ACERVO, snapshot);
  console.log(`Snapshot gravado: ${snapshot.totais.itens} sinais, ${snapshot.totais.alta} de relevância alta.`);

  // Mesma regra do webhook: copiar a capa enquanto a URL da CDN ainda responde.
  const jaTem = await chavesGuardadas();
  const m = await guardarMidias(snapshot.itens, jaTem);
  console.log(`Mídia: ${m.guardadas} guardadas · ${m.jaTinham} já no cache · ${m.falhas} falharam · ${m.semMidia} sinais sem capa.`);
  const podadas = await podarMidia(new Set(snapshot.itens.map((i) => i.id)));
  if (podadas) console.log(`${podadas} arquivo(s) de mídia órfã apagado(s).`);
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
