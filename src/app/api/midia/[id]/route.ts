import { NextResponse } from "next/server";
import { KV_STORE, gravarKVBinario, lerKVBinario, temToken } from "@/apify/cliente";
import { baixar, chaveMidia } from "@/apify/midia";
import { carregarAcervo } from "@/dados/acervo";

export const dynamic = "force-dynamic";

/**
 * Serve a capa de um sinal.
 *
 * Primeiro do Key-Value Store, onde a coleta guardou os bytes. Se não estiver
 * lá — item coletado antes deste cache existir — busca na fonte uma vez,
 * guarda e serve. Se a URL já expirou, devolve 404 e o cartão mostra a
 * marcação de mídia no lugar de uma imagem quebrada.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // O id vem da URL: sem esta checagem ele viraria caminho no store.
  if (!/^[a-zA-Z0-9_-]{4,64}$/.test(id)) {
    return NextResponse.json({ erro: "id inválido" }, { status: 400 });
  }
  if (!temToken() || !KV_STORE) {
    return NextResponse.json({ erro: "Apify não configurada" }, { status: 503 });
  }

  const chave = chaveMidia(id);

  try {
    const guardada = await lerKVBinario(KV_STORE, chave);
    if (guardada) return servir(guardada.bytes, guardada.contentType);

    // Não está no cache: tenta a fonte uma vez e guarda para as próximas.
    const acervo = await carregarAcervo();
    const item = acervo.itens.find((i) => i.id === id);
    if (!item?.midia?.url) {
      return NextResponse.json({ erro: "sem mídia" }, { status: 404 });
    }
    const baixada = await baixar(item.midia.url);
    if (!baixada) {
      return NextResponse.json({ erro: "mídia expirou na fonte" }, { status: 404 });
    }
    await gravarKVBinario(KV_STORE, chave, baixada.corpo, baixada.tipo).catch(() => {});
    return servir(baixada.corpo, baixada.tipo);
  } catch {
    return NextResponse.json({ erro: "falha ao buscar a mídia" }, { status: 502 });
  }
}

function servir(bytes: ArrayBuffer, contentType: string) {
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      // Os bytes nunca mudam para um id: o post é imutável depois de coletado.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
