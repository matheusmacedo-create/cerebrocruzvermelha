/**
 * Cliente da Apify sobre a API REST.
 *
 * O armazenamento do Cérebro é a própria Apify: Dataset guarda os itens
 * de cada run, Key-Value Store guarda o snapshot montado do acervo.
 * O app só lê — nunca há um banco intermediário para dessincronizar.
 */

const BASE = "https://api.apify.com/v2";

export class ApifySemToken extends Error {
  constructor() {
    super("APIFY_TOKEN não configurado. O Cérebro cai para o acervo semente.");
    this.name = "ApifySemToken";
  }
}

function token(): string {
  const t = process.env.APIFY_TOKEN;
  if (!t) throw new ApifySemToken();
  return t;
}

async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    // O acervo é servido do cache do Next; aqui a busca é sempre fresca.
    cache: "no-store",
  });
  if (!r.ok) {
    const corpo = await r.text().catch(() => "");
    throw new Error(`Apify ${r.status} em ${caminho}: ${corpo.slice(0, 300)}`);
  }
  return (await r.json()) as T;
}

export interface RunApify {
  id: string;
  actId: string;
  status: "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMING-OUT" | "TIMED-OUT" | "ABORTED";
  startedAt: string;
  finishedAt?: string;
  defaultDatasetId: string;
  defaultKeyValueStoreId: string;
}

/** Dispara um actor e devolve a run, sem esperar o fim. */
export async function rodarActor(actorId: string, input: unknown): Promise<RunApify> {
  const id = actorId.replace("/", "~");
  const r = await api<{ data: RunApify }>(`/acts/${id}/runs`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return r.data;
}

/** Dispara uma Task já configurada no painel da Apify. */
export async function rodarTask(taskId: string, input?: unknown): Promise<RunApify> {
  const r = await api<{ data: RunApify }>(`/actor-tasks/${taskId.replace("/", "~")}/runs`, {
    method: "POST",
    body: input ? JSON.stringify(input) : undefined,
  });
  return r.data;
}

/** Última run bem-sucedida de um actor. */
export async function ultimaRun(actorId: string): Promise<RunApify | null> {
  const id = actorId.replace("/", "~");
  const r = await api<{ data: { items: RunApify[] } }>(`/acts/${id}/runs?status=SUCCEEDED&desc=true&limit=1`);
  return r.data.items[0] ?? null;
}

/** Itens de um dataset. */
export async function lerDataset<T>(datasetId: string, limite = 1000): Promise<T[]> {
  return api<T[]>(`/datasets/${datasetId}/items?clean=true&limit=${limite}`);
}

/**
 * Lê um registro do Key-Value Store. Devolve null quando a chave não existe.
 *
 * Por padrão a leitura entra no cache do Next pelo mesmo tempo das telas: uma
 * leitura `no-store` aqui torna toda página que carrega o acervo dinâmica, e
 * as que são geradas estaticamente falham e caem para a semente — servindo
 * dado velho para sempre, em silêncio. O webhook pede `fresco` porque acabou
 * de gravar e precisa enxergar o que gravou.
 */
export async function lerKV<T>(storeId: string, chave: string, fresco = false): Promise<T | null> {
  const r = await fetch(`${BASE}/key-value-stores/${storeId}/records/${chave}`, {
    headers: { Authorization: `Bearer ${token()}` },
    ...(fresco ? { cache: "no-store" as const } : { next: { revalidate: 900 } }),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Apify KV ${r.status} ao ler ${chave}`);
  return (await r.json()) as T;
}

/** Grava um registro no Key-Value Store. É aqui que o snapshot do acervo mora. */
export async function gravarKV(storeId: string, chave: string, valor: unknown): Promise<void> {
  const r = await fetch(`${BASE}/key-value-stores/${storeId}/records/${chave}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify(valor),
  });
  if (!r.ok) throw new Error(`Apify KV ${r.status} ao gravar ${chave}`);
}

/** Grava bytes crus no Key-Value Store — é onde a mídia coletada fica. */
export async function gravarKVBinario(
  storeId: string,
  chave: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const r = await fetch(`${BASE}/key-value-stores/${storeId}/records/${chave}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": contentType },
    body: bytes,
  });
  if (!r.ok) throw new Error(`Apify KV ${r.status} ao gravar ${chave}`);
}

/** Lê bytes crus. Devolve null quando a chave não existe. */
export async function lerKVBinario(
  storeId: string,
  chave: string,
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const r = await fetch(`${BASE}/key-value-stores/${storeId}/records/${chave}`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Apify KV ${r.status} ao ler ${chave}`);
  return {
    bytes: await r.arrayBuffer(),
    contentType: r.headers.get("content-type") ?? "application/octet-stream",
  };
}

/** Lista as chaves do store. Usada para podar mídia órfã. */
export async function listarChavesKV(storeId: string, prefixo?: string): Promise<string[]> {
  const chaves: string[] = [];
  let exclusiveStartKey: string | undefined;
  do {
    const q = new URLSearchParams({ limit: "1000" });
    if (exclusiveStartKey) q.set("exclusiveStartKey", exclusiveStartKey);
    const r = await api<{ data: { items: { key: string }[]; isTruncated: boolean; nextExclusiveStartKey?: string } }>(
      `/key-value-stores/${storeId}/keys?${q}`,
    );
    for (const { key } of r.data.items) if (!prefixo || key.startsWith(prefixo)) chaves.push(key);
    exclusiveStartKey = r.data.isTruncated ? r.data.nextExclusiveStartKey : undefined;
  } while (exclusiveStartKey);
  return chaves;
}

export async function apagarKV(storeId: string, chave: string): Promise<void> {
  await fetch(`${BASE}/key-value-stores/${storeId}/records/${chave}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token()}` },
  });
}

export function temToken(): boolean {
  return Boolean(process.env.APIFY_TOKEN);
}

export const ACTOR_INSTAGRAM = process.env.APIFY_ACTOR_INSTAGRAM ?? "apify/instagram-post-scraper";
export const KV_STORE = process.env.APIFY_KV_STORE ?? "";
export const CHAVE_ACERVO = "acervo-atual";
