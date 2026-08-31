import { createHash } from "node:crypto";
import type { Direito, Item, MidiaItem, SaudeFonte } from "@/core/tipos";
import { CONTAS_POR_ID, contaPorHandle } from "@/core/contas";

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
  /** Presente só nos registros de erro que o actor mistura aos posts. */
  error?: string;
  errorDescription?: string;
  inputUrl?: string;
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

/**
 * Primeira frase da legenda vira título; a legenda inteira vira resumo.
 *
 * Com teto: boletim do COR-Rio abre com uma frase inteira antes do primeiro
 * ponto — "TEMPO AGORA | CHUVA MODERADA NA ZONA OESTE (31/08 - 11H10) De acordo
 * com o Sistema Alerta Rio, entre 10h45 e 11h, houve registro de ..." — e sem
 * o corte o título vira o resumo e ocupa três linhas do cartão.
 */
const TETO_TITULO = 96;

function tituloEResumo(caption: string | undefined): { titulo: string; resumo: string } {
  const limpa = (caption ?? "").replace(/\s+/g, " ").trim();
  if (!limpa) return { titulo: "Post sem legenda", resumo: "" };

  const fim = limpa.search(/(?<=[.!?])\s|\n/);
  const corte = fim > 20 && fim <= TETO_TITULO ? fim : TETO_TITULO;
  let titulo = limpa.slice(0, corte).trim();
  // Corta em palavra inteira quando o teto caiu no meio de uma.
  if (corte === TETO_TITULO && limpa.length > TETO_TITULO) {
    const ultimoEspaco = titulo.lastIndexOf(" ");
    if (ultimoEspaco > 40) titulo = titulo.slice(0, ultimoEspaco);
    titulo += "…";
  }
  return { titulo: titulo || limpa.slice(0, TETO_TITULO), resumo: limpa.slice(0, 600) };
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

/**
 * O actor devolve um registro de erro por perfil que falhou, misturado aos
 * posts. Sem ler esses registros, um handle quebrado some da coleta em
 * silêncio — a fonte para de aparecer e ninguém percebe.
 *
 * `not_found` é handle errado e pede correção na lista.
 * `no_items` costuma ser bloqueio do Instagram, intermitente: espera e volta.
 */
export function errosParaSaude(posts: PostInstagram[]): SaudeFonte[] {
  const saude: SaudeFonte[] = [];
  for (const p of posts) {
    if (!p.error) continue;
    const handle = (p.inputUrl ?? p.url ?? "").replace(/.*instagram\.com\//, "").replace(/\/$/, "");
    const conta = handle ? contaPorHandle(handle) : undefined;
    const bloqueio = p.error === "no_items";
    saude.push({
      fonte: conta?.nome ?? `Instagram @${handle || "?"}`,
      ok: false,
      itens: 0,
      detalhe: bloqueio
        ? `Instagram bloqueou a coleta (${p.error}). O handle existe; o bloqueio é intermitente e a próxima run costuma passar.`
        : `Handle não encontrado (${p.error}). Corrigir em src/core/contas.ts — enquanto isso esta fonte não é coletada.`,
      url: handle ? `https://instagram.com/${handle}` : "",
    });
  }
  return saude;
}

/**
 * Perfis que o Instagram bloqueou nesta run.
 *
 * `no_items` quase sempre é bloqueio, não conta vazia: o actor registra
 * "Request got blocked" e desiste. O bloqueio é por sessão e intermitente —
 * o mesmo perfil que falha agora costuma passar na tentativa seguinte.
 *
 * Vale separar de `not_found`, que é handle errado e retentar não resolve.
 */
/**
 * Saúde completa da coleta: o que falhou e o que deu certo.
 *
 * Reportar só as falhas deixa a fonte marcada como fora do ar para sempre —
 * o bloqueio do Instagram é intermitente, o perfil volta na run seguinte e
 * nada desmarca a falha anterior. Em uma semana o painel diria que metade
 * das fontes está morta enquanto todas coletam normalmente.
 *
 * Por isso o sucesso também é registrado: ele sobrescreve a falha antiga,
 * porque o snapshot deduplica a saúde pelo nome da fonte.
 */
export function saudeDaColeta(posts: PostInstagram[]): SaudeFonte[] {
  const porConta = new Map<string, number>();
  for (const p of posts) {
    if (!p.ownerUsername) continue;
    const conta = contaPorHandle(p.ownerUsername);
    if (!conta) continue;
    porConta.set(conta.id, (porConta.get(conta.id) ?? 0) + 1);
  }

  const sucessos: SaudeFonte[] = [];
  for (const [id, itens] of porConta) {
    const conta = CONTAS_POR_ID.get(id)!;
    sucessos.push({
      fonte: conta.nome,
      ok: true,
      itens,
      detalhe: `Coletado do Instagram (${conta.instagram}).`,
      url: `https://instagram.com/${conta.instagram?.replace(/^@/, "")}`,
    });
  }
  // A falha vem depois: se um perfil apareceu nas duas listas, o estado mais
  // recente da mesma run é o que interessa, e o erro é o mais informativo.
  return [...sucessos, ...errosParaSaude(posts)];
}

export function perfisBloqueados(posts: PostInstagram[]): string[] {
  const handles = new Set<string>();
  for (const p of posts) {
    if (p.error !== "no_items") continue;
    const h = (p.inputUrl ?? p.url ?? "").replace(/.*instagram\.com\//, "").replace(/\/$/, "");
    if (h) handles.add(h);
  }
  return [...handles];
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
