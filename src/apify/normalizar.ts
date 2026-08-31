import { createHash } from "node:crypto";
import type { Direito, Item, MidiaItem } from "@/core/tipos";
import { contaPorHandle } from "@/core/contas";

/**
 * Saída do actor apify/instagram-post-scraper.
 * Campos declarados como opcionais: o formato do scraper muda com o tempo
 * e um post sem legenda não pode derrubar a coleta inteira.
 */
export interface PostInstagram {
  id?: string;
  shortCode?: string;
  url?: string;
  type?: string; // "Image" | "Video" | "Sidecar"
  productType?: string; // "clips" = reels
  caption?: string;
  timestamp?: string;
  displayUrl?: string;
  videoUrl?: string;
  ownerUsername?: string;
  likesCount?: number;
  commentsCount?: number;
  videoViewCount?: number;
  isPinned?: boolean;
}

/** Id estável: o mesmo post coletado duas vezes não vira dois sinais. */
export function idDoPost(p: PostInstagram): string {
  const semente = p.id ?? p.shortCode ?? p.url ?? JSON.stringify(p).slice(0, 200);
  return createHash("sha1").update(semente).digest("hex").slice(0, 16);
}

function formatoDe(p: PostInstagram): MidiaItem["formato"] {
  if (p.productType === "clips") return "reels";
  if (p.type === "Sidecar") return "carrossel";
  if (p.type === "Story") return "story";
  return "feed";
}

function direitoDaConta(vinculo: string | undefined): Direito {
  switch (vinculo) {
    // Ser da Casa não implica autorização de imagem: isso é um ato humano,
    // registrado na Redação. O Cérebro nunca presume.
    case "casa":
      return "contexto";
    case "movimento":
      return "movimento";
    case "oficial":
      return "oficial";
    default:
      return "terceiro";
  }
}

/** Primeira linha da legenda vira título; o resto vira resumo. */
function tituloEResumo(caption: string | undefined): { titulo: string; resumo: string } {
  const limpa = (caption ?? "").replace(/\s+/g, " ").trim();
  if (!limpa) return { titulo: "Post sem legenda", resumo: "" };
  const corte = limpa.search(/(?<=[.!?])\s|\n/);
  const titulo = (corte > 20 ? limpa.slice(0, corte) : limpa.slice(0, 120)).trim();
  return { titulo: titulo || limpa.slice(0, 120), resumo: limpa.slice(0, 600) };
}

/**
 * Converte um post do Instagram em Item do Cérebro.
 * Devolve null quando o post não pertence a nenhuma conta da lista fechada —
 * a lista é a fronteira, e nada entra por fora dela.
 */
export function postParaItem(p: PostInstagram): Item | null {
  const handle = p.ownerUsername;
  if (!handle) return null;
  const conta = contaPorHandle(handle);
  if (!conta) return null;
  if (p.isPinned) return null;

  const { titulo, resumo } = tituloEResumo(p.caption);
  const formato = formatoDe(p);
  const ehVideo = p.type === "Video" || formato === "reels";

  const midia: MidiaItem | undefined = p.displayUrl
    ? {
        url: p.displayUrl,
        formato,
        tipo: ehVideo ? "video" : "foto",
        direito: direitoDaConta(conta.vinculo),
        credito: `${conta.instagram ?? handle} · ${conta.nome}`,
      }
    : undefined;

  return {
    id: idDoPost(p),
    fonte: conta.nome,
    contaId: conta.id,
    plataforma: "instagram",
    tipo: formato === "reels" ? "reels" : "post_instagram",
    titulo,
    resumo,
    url: p.url ?? `https://instagram.com/${handle}`,
    quando: p.timestamp ?? new Date().toISOString(),
    rel: "media", // o motor de decisão reescreve isso
    grupo: conta.categoria,
    midia,
    metricas: {
      curtidas: p.likesCount,
      comentarios: p.commentsCount,
      visualizacoes: p.videoViewCount,
    },
  };
}

export function postsParaItens(posts: PostInstagram[]): Item[] {
  const vistos = new Set<string>();
  const itens: Item[] = [];
  for (const p of posts) {
    const item = postParaItem(p);
    if (!item || vistos.has(item.id)) continue;
    vistos.add(item.id);
    itens.push(item);
  }
  return itens;
}
