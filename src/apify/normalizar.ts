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
  requestErrorMessages?: string[];
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

/**
 * O resumo é a matéria-prima da Redação: a importação monta título, linha
 * fina e corpo a partir dele. O Instagram aceita legendas de até 2.200
 * caracteres; um teto menor entregava o texto com um toco no fim
 * ("…credenciamento e alinha") e a Redação publicava menos do que a fonte
 * disse. As telas daqui continuam cortando na exibição.
 */
const TETO_RESUMO = 2200;

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
  return { titulo: titulo || limpa.slice(0, TETO_TITULO), resumo: limpa.slice(0, TETO_RESUMO) };
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
 * São três coisas diferentes, e confundi-las custa caro:
 *
 * - `not_found` — o handle não existe. Pede correção na lista.
 * - `no_items` COM mensagem de bloqueio — o Instagram recusou a sessão nesta
 *   run. Intermitente; a próxima costuma passar.
 * - `no_items` SEM mensagem — o caso comum, e não é falha: a conta não
 *   publicou dentro da janela pedida. Medido: @hemorio voltou "vazio" numa
 *   janela de 2 dias porque seu último post era de 2 dias atrás; numa janela
 *   de 30 dias trouxe 3 posts, sem nenhum bloqueio registrado.
 *
 * Tratar todo `no_items` como bloqueio faz o painel anunciar que metade das
 * fontes está morta quando elas apenas não postaram hoje.
 */
function classificar(p: PostInstagram): "inexistente" | "bloqueado" | "sem_posts" {
  if (p.error === "not_found") return "inexistente";
  const recusado = (p.requestErrorMessages ?? []).some((m) => /blocked|forbidden|rate limit/i.test(m));
  return recusado ? "bloqueado" : "sem_posts";
}

export function errosParaSaude(posts: PostInstagram[]): SaudeFonte[] {
  const saude: SaudeFonte[] = [];
  for (const p of posts) {
    if (!p.error) continue;
    const handle = (p.inputUrl ?? p.url ?? "").replace(/.*instagram\.com\//, "").replace(/\/$/, "");
    const conta = handle ? contaPorHandle(handle) : undefined;
    const tipo = classificar(p);
    saude.push({
      fonte: conta?.nome ?? `Instagram @${handle || "?"}`,
      // Não ter postado na janela não é a fonte estar fora do ar.
      ok: tipo === "sem_posts",
      itens: 0,
      detalhe:
        tipo === "inexistente"
          ? "Handle não encontrado. Corrigir em src/core/contas.ts — enquanto isso esta fonte não é coletada."
          : tipo === "bloqueado"
            ? "O Instagram recusou a sessão nesta run. É intermitente; a próxima costuma passar."
            : "Sem publicações novas na janela desta cadência. A conta está no ar; só não postou.",
      url: handle ? `https://instagram.com/${handle}` : "",
    });
  }
  return saude;
}

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
  // O registro de erro vem depois: se o perfil aparece nas duas listas, o
  // detalhe do erro é mais informativo que "coletado".
  return [...sucessos, ...errosParaSaude(posts)];
}

/**
 * Perfis que o Instagram realmente recusou nesta run.
 *
 * Só entra quem trouxe mensagem de bloqueio. Retentar um perfil que
 * simplesmente não postou na janela gasta run à toa: ele volta vazio de
 * novo, pela mesma razão.
 */
export function perfisBloqueados(posts: PostInstagram[]): string[] {
  const handles = new Set<string>();
  for (const p of posts) {
    if (!p.error || classificar(p) !== "bloqueado") continue;
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
