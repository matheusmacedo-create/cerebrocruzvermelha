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
import { AGENDA, CADENCIAS, FUSO, inputInstagram, type Cadencia } from "../src/apify/input";
import { ACTOR_INSTAGRAM } from "../src/apify/cliente";

const BASE = "https://api.apify.com/v2";
const dry = process.argv.includes("--dry");
const token = process.env.APIFY_TOKEN;

const nomeTask = (c: Cadencia) => `cerebro-cvrj-${c.replace(/_/g, "-")}`;

async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`Apify ${r.status} em ${init?.method ?? "GET"} ${caminho}: ${(await r.text()).slice(0, 300)}`);
  return (await r.json()) as T;
}

interface Nomeado { id: string; name: string }

async function main() {
  if (!token && !dry) {
    console.error("APIFY_TOKEN não configurado.");
    process.exit(1);
  }

  const tasksExistentes = dry ? [] : (await api<{ data: { items: Nomeado[] } }>("/actor-tasks?limit=1000")).data.items;
  const agendasExistentes = dry ? [] : (await api<{ data: { items: Nomeado[] } }>("/schedules?limit=1000")).data.items;

  for (const cadencia of CADENCIAS) {
    const nome = nomeTask(cadencia);
    const input = inputInstagram(cadencia);
    const agenda = AGENDA[cadencia];

    if (input.username.length === 0) {
      console.log(`· ${nome}: nenhuma conta com handle confirmado nesta cadência. Pulando.`);
      continue;
    }

    console.log(`\n── ${nome} ──`);
    console.log(`   ${input.username.length} perfis · ${agenda.descricao} · busca ${input.onlyPostsNewerThan} para trás`);
    console.log(`   ${input.username.join(", ")}`);
    if (dry) continue;

    // ── Task ────────────────────────────────────────────────────────────
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

    // ── Schedule ────────────────────────────────────────────────────────
    const nomeAgenda = `${nome}-agenda`;
    const agendaExistente = agendasExistentes.find((s) => s.name === nomeAgenda);
    const corpoAgenda = {
      name: nomeAgenda,
      cronExpression: agenda.cron,
      timezone: FUSO,
      isEnabled: true,
      isExclusive: true,
      description: `Coleta do Cérebro CVRJ — ${cadencia.replace(/_/g, " ")}, ${agenda.descricao}.`,
      actions: [{ type: "RUN_ACTOR_TASK", actorTaskId: task.id }],
    };
    const ag = agendaExistente
      ? (await api<{ data: Nomeado }>(`/schedules/${agendaExistente.id}`, { method: "PUT", body: JSON.stringify(corpoAgenda) })).data
      : (await api<{ data: Nomeado }>("/schedules", { method: "POST", body: JSON.stringify(corpoAgenda) })).data;
    console.log(`   agenda ${agendaExistente ? "atualizada" : "criada"}: ${ag.id} (${agenda.cron} ${FUSO})`);
  }

  console.log(dry ? "\n--dry: nada foi enviado para a Apify." : "\nPronto. Falta apontar o webhook — veja npm run webhook.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
