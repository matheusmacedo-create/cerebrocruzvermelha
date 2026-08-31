import type { Item } from "@/core/tipos";
import { KV_STORE, apagarKV, gravarKVBinario, listarChavesKV } from "./cliente";

/**
 * Mídia durável.
 *
 * As URLs da CDN do Instagram são assinadas e expiram em poucos dias. Apontar
 * o app direto para elas faz a mídia aparecer na coleta e morrer depois — o
 * Jornal vira uma parede de imagens quebradas justamente quando alguém volta
 * para revisar uma decisão antiga.
 *
 * Então os bytes são copiados para o Key-Value Store na hora da coleta e
 * servidos por /api/midia/[id]. Isso é cache de exibição para a triagem
 * interna: não muda nada sobre direito de imagem. O que não é `autorizado`
 * continua sem poder entrar numa peça da filial.
 *
 * Só a capa é guardada. Vídeo de reels tem megabytes e o Cérebro não é
 * um arquivo de vídeo — para assistir, o cartão manda para a fonte.
 */

export const PREFIXO = "midia-";
export const chaveMidia = (id: string) => `${PREFIXO}${id}`;

/** Teto por arquivo. Capa de post não passa disso; o que passar é engano. */
const TETO_BYTES = 8 * 1024 * 1024;

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

export interface ResultadoMidia {
  guardadas: number;
  falhas: number;
  /** Itens que não têm capa nenhuma — a maior parte do acervo documental. */
  semMidia: number;
  /** Capas que já estavam no store. */
  jaTinham: number;
}

/** Copia a capa de cada item para o Key-Value Store. */
export async function guardarMidias(itens: Item[], jaGuardadas?: Set<string>): Promise<ResultadoMidia> {
  if (!KV_STORE) return { guardadas: 0, falhas: 0, semMidia: 0, jaTinham: 0 };
  const r: ResultadoMidia = { guardadas: 0, falhas: 0, semMidia: 0, jaTinham: 0 };

  for (const item of itens) {
    if (!item.midia?.url) {
      r.semMidia++;
      continue;
    }
    if (jaGuardadas?.has(chaveMidia(item.id))) {
      r.jaTinham++;
      continue;
    }
    try {
      const bytes = await baixar(item.midia.url);
      if (!bytes) {
        r.falhas++;
        continue;
      }
      await gravarKVBinario(KV_STORE, chaveMidia(item.id), bytes.corpo, bytes.tipo);
      r.guardadas++;
    } catch {
      // Uma capa que não baixou não pode derrubar a coleta inteira: o item
      // entra sem mídia e o cartão mostra a marcação no lugar.
      r.falhas++;
    }
  }
  return r;
}

export async function baixar(url: string): Promise<{ corpo: ArrayBuffer; tipo: string } | null> {
  const r = await fetch(url, {
    // A CDN não exige referer, mas mandar o nosso seria vazar o domínio interno.
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!r.ok) return null;

  const tipo = (r.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!TIPOS_ACEITOS.includes(tipo)) return null;

  const tamanho = Number(r.headers.get("content-length") ?? 0);
  if (tamanho > TETO_BYTES) return null;

  const corpo = await r.arrayBuffer();
  if (corpo.byteLength === 0 || corpo.byteLength > TETO_BYTES) return null;
  return { corpo, tipo };
}

/**
 * Apaga a mídia de itens que saíram do acervo.
 *
 * Sem isto o store cresce para sempre e a conta da Apify junto — o acervo
 * roda de hora em hora, então são centenas de arquivos por semana.
 */
export async function podarMidia(idsVivos: Set<string>): Promise<number> {
  if (!KV_STORE) return 0;
  const chaves = await listarChavesKV(KV_STORE, PREFIXO);
  const orfas = chaves.filter((k) => !idsVivos.has(k.slice(PREFIXO.length)));
  for (const k of orfas) await apagarKV(KV_STORE, k);
  return orfas.length;
}

export async function chavesGuardadas(): Promise<Set<string>> {
  if (!KV_STORE) return new Set();
  return new Set(await listarChavesKV(KV_STORE, PREFIXO));
}
