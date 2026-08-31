import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { MOTIVOS, type MotivoRecusa, type Recusa } from "@/core/tipos";
import { carregarAcervo } from "@/dados/acervo";
import { desfazerRecusa, lerRecusas, registrarRecusa } from "@/dados/feedback";

export const dynamic = "force-dynamic";

/**
 * Onde a decisão humana volta para o Cérebro.
 *
 * Recusar não é só esconder o cartão: o motivo é guardado e passa a pesar nas
 * próximas leituras. Sem isso a tela repete amanhã o que a equipe recusou hoje.
 */
export async function POST(req: Request) {
  let corpo: { id?: string; motivo?: string };
  try {
    corpo = (await req.json()) as typeof corpo;
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const { id, motivo } = corpo;
  if (!id) return NextResponse.json({ erro: "faltou o id do sinal" }, { status: 400 });
  if (!motivo || !(motivo in MOTIVOS)) {
    return NextResponse.json(
      { erro: "motivo inválido", aceitos: Object.keys(MOTIVOS) },
      { status: 400 },
    );
  }

  const acervo = await carregarAcervo();
  const item = acervo.itens.find((i) => i.id === id);
  if (!item) return NextResponse.json({ erro: `sinal ${id} não encontrado` }, { status: 404 });

  const recusa: Recusa = {
    id: item.id,
    motivo: motivo as MotivoRecusa,
    // Título e fonte ficam gravados: o item sai do acervo, a lição não sai.
    titulo: item.titulo,
    contaId: item.contaId,
    fonte: item.fonte,
    quando: new Date().toISOString(),
  };

  try {
    const lista = await registrarRecusa(recusa);
    for (const p of ["/", "/jornal", "/acervo"]) revalidatePath(p);
    return NextResponse.json({ ok: true, recusas: lista.length });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 503 });
  }
}

/** Desfaz uma recusa. Errar o clique não pode custar a pauta. */
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "faltou o id" }, { status: 400 });
  try {
    const lista = await desfazerRecusa(id);
    for (const p of ["/", "/jornal", "/acervo"]) revalidatePath(p);
    return NextResponse.json({ ok: true, recusas: lista.length });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 503 });
  }
}

export async function GET() {
  const recusas = await lerRecusas();
  return NextResponse.json({ total: recusas.length, recusas }, { headers: { "Cache-Control": "no-store" } });
}
