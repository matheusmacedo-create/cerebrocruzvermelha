import type { Item, SaudeFonte } from "@/core/tipos";

/**
 * A coleta documental viva.
 *
 * O Instagram tem a Apify; o resto do mundo — INMET, diário oficial, RSS
 * das agências e do movimento — vinha congelado do acervo semente de
 * 30/08/2026 e nunca mais era recoletado. O sintoma na tela: 87 avisos do
 * INMET repetidos (de Geada no Sul a Baixa Umidade no Centro-Oeste),
 * notícia velha rodando como nova e a saúde de fonte fossilizada.
 *
 * Este módulo refaz essas leituras a cada webhook da coleta. Regras:
 *
 * - Cada fonte falha sozinha: uma fora do ar vira saúde visível, nunca
 *   derruba as outras nem a coleta do Instagram.
 * - INMET entra FILTRADO para o Rio de Janeiro: aviso de geada em Santa
 *   Catarina não é sinal para a filial RJ.
 * - Diário sem edição no dia (domingo, feriado) NÃO é falha — confundir
 *   isso com bloqueio foi o erro que o painel de fontes já pagou uma vez.
 * - Ids são estáveis por conteúdo: recoletar não duplica.
 */

export interface ColetaDocumental {
  itens: Item[];
  saude: SaudeFonte[];
}

const TIMEOUT_MS = 8_000;
const UA = "Mozilla/5.0 (compatible; cerebro-cvrj; +https://cerebrocruzvermelha.vercel.app)";

export async function coletarDocumentais(): Promise<ColetaDocumental> {
  const fontes: { nome: string; url: string; coletar: () => Promise<{ itens: Item[]; detalhe?: string }> }[] = [
    { nome: "INMET", url: "https://apiprevmet3.inmet.gov.br/avisos/ativos", coletar: inmet },
    { nome: "DOM Rio — últimos", url: "https://doweb.rio.rj.gov.br", coletar: domRio },
    { nome: "IFRC GO", url: "https://go.ifrc.org", coletar: ifrcGo },
    {
      nome: "Agência Brasil — últimas",
      url: "https://agenciabrasil.ebc.com.br/rss/geral/feed.xml",
      coletar: () => agenciaBrasil("geral", "Agência Brasil — últimas"),
    },
    {
      nome: "Agência Brasil — saúde",
      url: "https://agenciabrasil.ebc.com.br/rss/saude/feed.xml",
      coletar: () => agenciaBrasil("saude", "Agência Brasil — saúde"),
    },
    {
      nome: "Agência Brasil — direitos humanos",
      url: "https://agenciabrasil.ebc.com.br/rss/direitos-humanos/feed.xml",
      coletar: () => agenciaBrasil("direitos-humanos", "Agência Brasil — direitos humanos"),
    },
    {
      nome: "Ministério da Saúde — notícias",
      url: "https://www.gov.br/saude/pt-br/assuntos/noticias",
      coletar: ministerioDaSaude,
    },
    { nome: "Alerta Rio — pluviometria", url: "https://alertario.rio.rj.gov.br", coletar: pluviometria },
  ];

  const itens: Item[] = [];
  const saude: SaudeFonte[] = [];

  const resultados = await Promise.allSettled(fontes.map((f) => f.coletar()));
  resultados.forEach((r, i) => {
    const f = fontes[i];
    if (r.status === "fulfilled") {
      itens.push(...r.value.itens);
      saude.push({ fonte: f.nome, ok: true, itens: r.value.itens.length, detalhe: r.value.detalhe ?? "", url: f.url });
    } else {
      saude.push({ fonte: f.nome, ok: false, itens: 0, detalhe: String(r.reason).slice(0, 160), url: f.url });
    }
  });

  return { itens, saude };
}

/* ------------------------------------------------------------------ */
/* Fontes                                                              */
/* ------------------------------------------------------------------ */

interface AvisoInmet {
  id?: number | string;
  descricao?: string;
  severidade?: string;
  estados?: string;
  municipios?: string;
  data_inicio?: string;
  data_fim?: string;
}

async function inmet(): Promise<{ itens: Item[]; detalhe?: string }> {
  const d = await lerJSON<{ hoje?: AvisoInmet[]; futuro?: AvisoInmet[] }>(
    "https://apiprevmet3.inmet.gov.br/avisos/ativos",
  );
  const todos = [...(d.hoje ?? []), ...(d.futuro ?? [])];
  const doRio = todos.filter((a) => (a.estados ?? "").includes("Rio de Janeiro"));

  const itens = doRio.map((a): Item => {
    const municipiosRJ = ((a.municipios ?? "").match(/- RJ \(/g) ?? []).length;
    return {
      id: hash(`inmet:${a.id}`),
      fonte: "INMET",
      plataforma: "api",
      tipo: "aviso_meteorologico",
      titulo: `Aviso de ${a.descricao ?? "condição meteorológica"}. Severidade Grau: ${a.severidade ?? "?"}`,
      resumo: `Aviso do INMET vigente para o estado do Rio de Janeiro${
        municipiosRJ ? `, alcançando ${municipiosRJ} município(s) fluminense(s)` : ""
      }. Válido de ${soData(a.data_inicio)} a ${soData(a.data_fim)}.`,
      url: `https://apiprevmet3.inmet.gov.br/avisos/rss/${a.id}`,
      quando: a.data_inicio ?? new Date().toISOString(),
      rel: "media",
      grupo: "oficial",
    };
  });
  return { itens, detalhe: `${todos.length} avisos ativos no país; ${doRio.length} alcançam o RJ.` };
}

async function domRio(): Promise<{ itens: Item[]; detalhe?: string }> {
  const itens: Item[] = [];
  let semEdicao = 0;
  for (const dia of [0, 1]) {
    const data = new Date(Date.now() - dia * 86_400_000).toISOString().slice(0, 10);
    try {
      const d = await lerJSON<{
        erro?: boolean;
        itens?: { id: string; data: string; numero: string; suplemento: number; paginas: string }[];
      }>(`https://doweb.rio.rj.gov.br/apifront/portal/edicoes/edicoes_from_data/${data}.json`);
      for (const e of d.itens ?? []) {
        itens.push({
          id: hash(`dom-rio:${e.id}`),
          fonte: "Diário Oficial do Município (Rio)",
          plataforma: "html",
          tipo: "diario_oficial",
          titulo: `DOM Rio ${e.data} — edição ${e.numero}${e.suplemento ? " (suplemento)" : ""}`,
          // O resumo não pode carregar termo do léxico ("defesa civil",
          // "emergência"): o motor pontua sobre este texto e uma edição
          // comum do diário subiria de nota por causa da nossa legenda.
          resumo: `Edição ${e.numero} do jornal municipal, de ${e.data}, com ${e.paginas} páginas, disponível para consulta e triagem.`,
          url: `https://doweb.rio.rj.gov.br/portal/edicoes/download/${e.id}`,
          quando: data,
          rel: "baixa",
          grupo: "oficial",
        });
      }
      if (!d.itens?.length) semEdicao++;
    } catch {
      // 404 na data = sem edição publicada (domingo, feriado). Não é falha.
      semEdicao++;
    }
  }
  return {
    itens,
    detalhe: semEdicao ? `${semEdicao} dia(s) sem edição — domingo e feriado não publicam; não é falha.` : undefined,
  };
}

async function ifrcGo(): Promise<{ itens: Item[] }> {
  const d = await lerJSON<{
    results?: { id: number; name: string; summary?: string; disaster_start_date?: string; created_at?: string }[];
  }>("https://goadmin.ifrc.org/api/v2/event/?countries__iso3=BRA&limit=8&ordering=-disaster_start_date");
  const itens = (d.results ?? []).map(
    (e): Item => ({
      id: hash(`ifrc-go:${e.id}`),
      fonte: "IFRC GO",
      plataforma: "api",
      tipo: "apelo",
      titulo: e.name.trim(),
      resumo: semHTML(e.summary ?? "").slice(0, 400),
      url: `https://go.ifrc.org/emergencies/${e.id}`,
      quando: e.disaster_start_date ?? e.created_at ?? "",
      rel: "media",
      grupo: "oficial",
    }),
  );
  return { itens };
}

async function agenciaBrasil(feed: string, fonte: string): Promise<{ itens: Item[] }> {
  const xml = await lerTexto(`https://agenciabrasil.ebc.com.br/rss/${feed}/feed.xml`);
  return { itens: doRSS(xml, fonte, 8) };
}

async function ministerioDaSaude(): Promise<{ itens: Item[] }> {
  // A URL responde 302 e o fetch segue o redirecionamento sozinho.
  const xml = await lerTexto("https://www.gov.br/saude/pt-br/assuntos/noticias/RSS");
  // O gov.br descontinuou o RSS em silêncio: a URL redireciona para a
  // página HTML. Falhar com o motivo certo poupa a próxima pessoa de
  // depurar o leitor de feed — o problema é a fonte, não o parser.
  if (/<!DOCTYPE html/i.test(xml.slice(0, 200))) {
    throw new Error("o gov.br respondeu a página HTML, não um feed — o RSS foi descontinuado; falta nova rota de coleta");
  }
  return { itens: doRSS(xml, "Ministério da Saúde — notícias", 8) };
}

async function pluviometria(): Promise<{ itens: Item[]; detalhe?: string }> {
  const xml = await lerTexto("https://alertario.rio.rj.gov.br/upload/xml/Chuvas.xml");
  const hora = xml.match(/<estacoes hora="([^"]+)"/)?.[1] ?? new Date().toISOString();
  const estacoes: { nome: string; h24: number; h01: number }[] = [];
  const re = /<estacao [^>]*nome="([^"]+)"[^>]*>[\s\S]*?<chuvas [^>]*h01="([\d.]+)"[^>]*h24="([\d.]+)"/g;
  for (let m = re.exec(xml); m; m = re.exec(xml)) {
    estacoes.push({ nome: m[1], h01: Number(m[2]), h24: Number(m[3]) });
  }
  const maior = [...estacoes].sort((a, b) => b.h24 - a.h24)[0];
  // Cidade seca não é sinal: só entra quando choveu de verdade em 24h.
  if (!maior || maior.h24 < 10) {
    return { itens: [], detalhe: `${estacoes.length} estações lidas; maior acumulado 24h: ${maior?.h24 ?? 0}mm — sem chuva relevante.` };
  }
  const top = [...estacoes].sort((a, b) => b.h24 - a.h24).slice(0, 3);
  return {
    itens: [
      {
        id: hash(`pluvio:${hora.slice(0, 10)}`),
        fonte: "Alerta Rio",
        plataforma: "api",
        tipo: "pluviometria",
        titulo: `Precipitação das estações Alerta Rio — ${hora}`,
        resumo: `Maiores acumulados em 24h: ${top.map((e) => `${e.nome} ${e.h24}mm`).join(", ")}. Fonte de decisão interna de deslocamento.`,
        url: "https://alertario.rio.rj.gov.br/",
        quando: hora,
        rel: "baixa",
        grupo: "oficial",
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Encanamento                                                         */
/* ------------------------------------------------------------------ */

async function lerTexto(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return r.text();
}

async function lerJSON<T>(url: string): Promise<T> {
  return JSON.parse(await lerTexto(url)) as T;
}

/** Leitor de RSS/Atom mínimo: título, link, data e descrição de cada entrada. */
function doRSS(xml: string, fonte: string, teto: number): Item[] {
  const itens: Item[] = [];
  // RSS usa <item>; o gov.br responde Atom, que usa <entry>.
  const blocos =
    xml.match(/<item[\s>][\s\S]*?<\/item>/g) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/g) ?? [];
  for (const b of blocos.slice(0, teto)) {
    const titulo = campoRSS(b, "title");
    const url = campoRSS(b, "link") ?? b.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? null;
    if (!titulo || !url) continue;
    itens.push({
      id: hash(`rss:${url}`),
      fonte,
      plataforma: "rss",
      tipo: "noticia_oficial",
      titulo,
      resumo: semHTML(campoRSS(b, "description") ?? campoRSS(b, "summary") ?? "").slice(0, 400),
      url,
      quando: campoRSS(b, "pubDate") ?? campoRSS(b, "dc:date") ?? campoRSS(b, "updated") ?? "",
      rel: "media",
      grupo: "oficial",
    });
  }
  if (itens.length === 0) throw new Error("o feed respondeu, mas nenhum item pôde ser lido");
  return itens;
}

function campoRSS(bloco: string, campo: string): string | null {
  const m = bloco.match(new RegExp(`<${campo}[^>]*>([\\s\\S]*?)</${campo}>`, "i"));
  if (!m) return null;
  return semHTML(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).trim() || null;
}

function semHTML(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function soData(iso?: string): string {
  return (iso ?? "").slice(0, 10) || "?";
}

/** Id estável de 16 hex, no formato dos ids do acervo. FNV-1a dobrado. */
function hash(texto: string): string {
  let a = 2166136261;
  let b = 0x811c9dc5 ^ 0x5bd1e995;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    a = Math.imul(a ^ c, 16777619);
    b = Math.imul(b ^ ((c << 8) | (c >> 3)), 16777619);
  }
  return ((a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0")).slice(0, 16);
}
