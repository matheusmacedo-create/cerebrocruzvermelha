/**
 * Confere a lista fechada contra a Apify, um handle por run.
 *
 *   npx tsx scripts/verificar-handles.ts
 *   npx tsx scripts/verificar-handles.ts operacoesrio metro_rio   (só estes)
 *
 * Uma run por handle porque, em lote, o actor devolve os registros de
 * `not_found` sem o `inputUrl` — e aí não dá para saber qual handle falhou.
 * Handle inexistente não gera post cobrável, então conferir é quase de graça.
 *
 * Rode isto quando a coleta trouxer menos do que devia. Handle quebrado é a
 * falha mais cara do sistema: a fonte some sem avisar.
 */
import { ACTOR_INSTAGRAM, lerDataset, rodarActor, temToken } from "../src/apify/cliente";
import { CONTAS, perfisInstagram } from "../src/core/contas";
import type { PostInstagram } from "../src/apify/normalizar";

const alvos = process.argv.slice(2).length ? process.argv.slice(2) : perfisInstagram();

async function main() {
  if (!temToken()) {
    console.error("APIFY_TOKEN não configurado.");
    process.exit(1);
  }
  console.log(`Conferindo ${alvos.length} handles, um por run.\n`);

  const runs = await Promise.all(
    alvos.map(async (h) => ({ handle: h, run: await rodarActor(ACTOR_INSTAGRAM, { username: [h], resultsLimit: 1 }) })),
  );

  const linhas: string[] = [];
  let quebrados = 0;
  for (const { handle, run } of runs) {
    const posts = await esperar(run.defaultDatasetId);
    const ok = posts.find((p) => p.ownerUsername);
    const erro = posts.find((p) => p.error);
    const conta = CONTAS.find((c) => c.instagram?.replace(/^@/, "") === handle);

    let estado: string;
    if (ok && ok.ownerUsername !== handle) {
      // Redireciona para outra conta: o pior caso, porque coletaria
      // conteúdo de outra organização sem ninguém notar.
      estado = `REDIRECIONA para @${ok.ownerUsername}`;
      quebrados++;
    } else if (ok) estado = "ok";
    else if (erro?.error === "not_found") {
      estado = "NÃO EXISTE";
      quebrados++;
    } else estado = `bloqueado (${erro?.error ?? "sem dados"})`;

    linhas.push(`  ${estado === "ok" ? "✓" : "✗"} ${handle.padEnd(26)} ${estado}${conta ? `  · ${conta.nome}` : ""}`);
  }

  console.log(linhas.sort().join("\n"));
  const semIg = CONTAS.filter((c) => c.instagramStatus === "ausente");
  if (semIg.length) {
    console.log(`\n${semIg.length} contas sem Instagram confirmado (fora da coleta):`);
    for (const c of semIg) console.log(`  · ${c.nome}${c.x ? ` — só ${c.x} no X` : ""}`);
  }
  console.log(quebrados === 0 ? "\nLista íntegra." : `\n${quebrados} handle(s) para corrigir em src/core/contas.ts.`);
  process.exit(quebrados === 0 ? 0 : 1);
}

async function esperar(datasetId: string, tentativas = 24): Promise<PostInstagram[]> {
  for (let i = 0; i < tentativas; i++) {
    await new Promise((r) => setTimeout(r, 10_000));
    const p = await lerDataset<PostInstagram>(datasetId, 5).catch(() => []);
    if (p.length) return p;
  }
  return [];
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
