/**
 * Aponta os webhooks das Tasks da Apify para o Cérebro publicado.
 *
 *   npm run webhook -- https://seu-app.vercel.app
 *   npm run webhook -- https://seu-app.vercel.app --dry
 *
 * Quando uma coleta termina, a Apify chama /api/webhook/apify, que lê o
 * dataset da run, normaliza contra a lista fechada, mescla no snapshot e
 * revalida as telas. Sem isto as coletas rodam mas o app não fica sabendo.
 *
 * Idempotente: um webhook por task, atualizado no lugar.
 */
import { CADENCIAS, type Cadencia } from "../src/apify/input";

const BASE = "https://api.apify.com/v2";
const token = process.env.APIFY_TOKEN;
const segredo = process.env.APIFY_WEBHOOK_SECRET;
const dry = process.argv.includes("--dry");
const base = process.argv.slice(2).find((a) => a.startsWith("http"))?.replace(/\/$/, "");

const nomeTask = (c: Cadencia) => `cerebro-cvrj-${c.replace(/_/g, "-")}`;

async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`Apify ${r.status} em ${init?.method ?? "GET"} ${caminho}: ${(await r.text()).slice(0, 300)}`);
  return (await r.json()) as T;
}

interface Nomeado { id: string; name?: string; requestUrl?: string; condition?: { actorTaskId?: string } }

async function main() {
  if (!base) {
    console.error("Faltou a URL. Ex.: npm run webhook -- https://seu-app.vercel.app");
    process.exit(1);
  }
  if (!token) {
    console.error("APIFY_TOKEN não configurado.");
    process.exit(1);
  }
  if (!segredo) {
    // Sem segredo o endpoint aceita qualquer chamada — inclusive de quem
    // descobrir a URL. Melhor parar do que abrir isso em silêncio.
    console.error("APIFY_WEBHOOK_SECRET não configurado. Defina o mesmo valor aqui e na Vercel.");
    process.exit(1);
  }

  const url = `${base}/api/webhook/apify?segredo=${encodeURIComponent(segredo)}`;
  console.log(`Apontando para ${base}/api/webhook/apify\n`);

  const tasks = (await api<{ data: { items: Nomeado[] } }>("/actor-tasks?limit=1000")).data.items;
  const webhooks = (await api<{ data: { items: Nomeado[] } }>("/webhooks?limit=1000")).data.items;

  for (const cadencia of CADENCIAS) {
    const nome = nomeTask(cadencia);
    const task = tasks.find((t) => t.name === nome);
    if (!task) {
      console.log(`· ${nome}: task não encontrada. Rode npm run provisionar antes.`);
      continue;
    }
    const corpo = {
      eventTypes: ["ACTOR.RUN.SUCCEEDED"],
      condition: { actorTaskId: task.id },
      requestUrl: url,
      description: `Cérebro CVRJ — avisa o app quando a coleta ${cadencia.replace(/_/g, " ")} termina.`,
      isAdHoc: false,
    };
    if (dry) {
      console.log(`· ${nome}: apontaria o webhook para o app.`);
      continue;
    }
    const existente = webhooks.find((w) => w.condition?.actorTaskId === task.id);
    const w = existente
      ? (await api<{ data: Nomeado }>(`/webhooks/${existente.id}`, { method: "PUT", body: JSON.stringify(corpo) })).data
      : (await api<{ data: Nomeado }>("/webhooks", { method: "POST", body: JSON.stringify(corpo) })).data;
    console.log(`· ${nome}: webhook ${existente ? "atualizado" : "criado"} (${w.id})`);
  }
  console.log(dry ? "\n--dry: nada foi enviado." : "\nPronto. A próxima coleta já avisa o app.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
