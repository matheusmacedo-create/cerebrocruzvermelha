/**
 * Cria (ou atualiza) as Tasks e as Schedules do Cérebro na Apify.
 *
 *   npm run provisionar          cria e agenda
 *   npm run provisionar -- --dry mostra o que faria, sem tocar na conta
 *
 * A coleta é agendada na Apify, não na Vercel: o plano Hobby limita cron, e
 * agendar onde a coleta acontece deixa o app só recebendo o webhook.
 *
 * Idempotente — rodar de novo atualiza o que existe em vez de duplicar.
 * Rode sempre que a lista fechada mudar, para as Tasks acompanharem.
 */
import { FUSO, todosOsLotes } from "../src/apify/input";
import { ACTOR_INSTAGRAM } from "../src/apify/cliente";

const BASE = "https://api.apify.com/v2";
const dry = process.argv.includes("--dry");
const token = process.env.APIFY_TOKEN;

async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`Apify ${r.status} em ${init?.method ?? "GET"} ${caminho}: ${(await r.text()).slice(0, 300)}`);
  // DELETE responde 204 sem corpo: ler JSON aí quebra numa chamada que deu certo.
  if (r.status === 204) return undefined as T;
  const texto = await r.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}

interface Nomeado { id: string; name: string }

async function main() {
  if (!token && !dry) {
    console.error("APIFY_TOKEN não configurado.");
    process.exit(1);
  }

  const tasksExistentes = dry ? [] : (await api<{ data: { items: Nomeado[] } }>("/actor-tasks?limit=1000")).data.items;
  const agendasExistentes = dry ? [] : (await api<{ data: { items: Nomeado[] } }>("/schedules?limit=1000")).data.items;

  const lotes = todosOsLotes();
  console.log(`${lotes.length} runs por ciclo, espalhadas pelo dia.\n`);

  for (const lote of lotes) {
    const { nome, input, cron, descricao } = lote;
    if (input.username.length === 0) continue;

    console.log(`── ${nome} ──`);
    console.log(`   ${input.username.length} perfis · ${descricao} · busca ${input.onlyPostsNewerThan} para trás`);
    console.log(`   ${input.username.join(", ")}`);
    if (dry) continue;

    const jaExiste = tasksExistentes.find((t) => t.name === nome);
    const corpo = {
      actId: ACTOR_INSTAGRAM.replace("/", "~"),
      name: nome,
      input,
      options: { memoryMbytes: 1024, timeoutSecs: 900 },
    };
    const task = jaExiste
      ? (await api<{ data: Nomeado }>(`/actor-tasks/${jaExiste.id}`, { method: "PUT", body: JSON.stringify(corpo) })).data
      : (await api<{ data: Nomeado }>("/actor-tasks", { method: "POST", body: JSON.stringify(corpo) })).data;
    console.log(`   task ${jaExiste ? "atualizada" : "criada"}: ${task.id}`);

    const nomeAgenda = `${nome}-agenda`;
    const agendaExistente = agendasExistentes.find((s) => s.name === nomeAgenda);
    const corpoAgenda = {
      name: nomeAgenda,
      cronExpression: cron,
      timezone: FUSO,
      isEnabled: true,
      isExclusive: true,
      description: `Coleta do Cérebro CVRJ — ${descricao}.`,
      actions: [{ type: "RUN_ACTOR_TASK", actorTaskId: task.id }],
    };
    const ag = agendaExistente
      ? (await api<{ data: Nomeado }>(`/schedules/${agendaExistente.id}`, { method: "PUT", body: JSON.stringify(corpoAgenda) })).data
      : (await api<{ data: Nomeado }>("/schedules", { method: "POST", body: JSON.stringify(corpoAgenda) })).data;
    console.log(`   agenda ${agendaExistente ? "atualizada" : "criada"}: ${ag.id} (${cron})\n`);
  }

  // Tasks e agendas de uma divisão anterior ficariam rodando em paralelo,
  // dobrando a coleta e o bloqueio. São removidas — a agenda primeiro, porque
  // a Apify recusa apagar uma task que ainda tem agenda apontando para ela.
  if (!dry) {
    const vivos = new Set(lotes.map((l) => l.nome));
    for (const a of agendasExistentes) {
      const alvo = a.name.replace(/-agenda$/, "");
      if (!a.name.startsWith("cerebro-cvrj-") || vivos.has(alvo)) continue;
      await api(`/schedules/${a.id}`, { method: "DELETE" }).catch((e) => console.log(`   ! agenda ${a.name}: ${e}`));
      console.log(`   agenda obsoleta removida: ${a.name}`);
    }
    for (const t of tasksExistentes) {
      if (!t.name.startsWith("cerebro-cvrj-") || vivos.has(t.name)) continue;
      await api(`/actor-tasks/${t.id}`, { method: "DELETE" }).catch((e) => console.log(`   ! task ${t.name}: ${e}`));
      console.log(`   task obsoleta removida: ${t.name}`);
    }
  }

  if (dry) {
    console.log("\n--dry: nada foi enviado para a Apify.");
    return;
  }

  // Dizer "falta apontar o webhook" quando ele já está apontado manda a pessoa
  // procurar problema onde não há. O script confere antes de mandar recado.
  const webhooks = (await api<{ data: { items: { condition?: { actorTaskId?: string } }[] } }>(
    "/webhooks?limit=1000",
  )).data.items;
  const comWebhook = new Set(webhooks.map((w) => w.condition?.actorTaskId).filter(Boolean));
  const semWebhook = lotes.filter((l) => {
    const t = tasksExistentes.find((x) => x.name === l.nome);
    return !t || !comWebhook.has(t.id);
  });

  console.log(
    semWebhook.length === 0
      ? "\nPronto. Os webhooks já apontam para o app — a próxima coleta avisa sozinha."
      : `\nPronto. ${semWebhook.length} task(s) ainda sem webhook: rode npm run webhook -- <url do app>.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
