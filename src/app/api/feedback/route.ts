import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { MOTIVOS, type Aceite, type EventoDaRedacao, type MotivoRecusa, type Recusa } from "@/core/tipos";
import { carregarAcervo } from "@/dados/acervo";
import { desfazerRecusa, lerAceites, lerRecusas, registrarAceite, registrarRecusa } from "@/dados/feedback";
import { autorizadoNoContrato } from "../_lib/autorizacao";

export const dynamic = "force-dynamic";

const EVENTOS = new Set<EventoDaRedacao>(["pautado", "publicado"]);
const TELAS = ["/", "/jornal", "/acervo"];

/**
 * Onde a decisão humana volta para o Cérebro.
 *
 * Recusar não é só esconder o cartão: o motivo é guardado e passa a pesar nas
 * próximas leituras. Sem isso a tela repete amanhã o que a equipe recusou hoje.
 *
 * O "sim" também entra por aqui: `{ id, evento: "pautado" | "publicado" }`
 * diz que a Redação abriu um pacote para o sinal ou que a peça foi ao ar.
 * É o que tira da atenção o que a Casa já publicou.
 *
 * Mesma porta do contrato: com PAUTA_TOKEN configurado, exige Bearer. Esta
 * é memória editorial da filial — sem a porta, qualquer pessoa na internet
 * apagava recusas ou plantava aceites.
 */
export async function POST(req: Request) {
  if (!autorizadoNoContrato(req)) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  let corpo: { id?: string; motivo?: string; evento?: string; pacoteId?: string; url?: string; canais?: unknown };
  try {
    corpo = (await req.json()) as typeof corpo;
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const { id, motivo, evento } = corpo;
  if (!id || typeof id !== "string") return NextResponse.json({ erro: "faltou o id do sinal" }, { status: 400 });

  const acervo = await carregarAcervo();
  const item = acervo.itens.find((i) => i.id === id);

  if (evento) {
    if (!EVENTOS.has(evento as EventoDaRedacao)) {
      return NextResponse.json({ erro: "evento inválido", aceitos: [...EVENTOS] }, { status: 400 });
    }
    // "Publicado" chega dias depois de "pautado", e o sinal pode já ter saído
    // da janela do acervo. O aceite anterior do mesmo id guarda título e fonte
    // — e é a prova de que o id passou pela porta quando ainda estava aqui.
    const base = item ?? (await lerAceites()).find((a) => a.id === id);
    if (!base) return NextResponse.json({ erro: `sinal ${id} não encontrado` }, { status: 404 });
    const aceite: Aceite = {
      id,
      evento: evento as EventoDaRedacao,
      titulo: base.titulo,
      contaId: base.contaId,
      fonte: base.fonte,
      quando: new Date().toISOString(),
      ...(typeof corpo.pacoteId === "string" && corpo.pacoteId ? { pacoteId: corpo.pacoteId.slice(0, 80) } : {}),
      ...(typeof corpo.url === "string" && /^https?:\/\//.test(corpo.url) ? { url: corpo.url.slice(0, 500) } : {}),
      ...(Array.isArray(corpo.canais)
        ? {
            canais: corpo.canais
              .filter((c): c is string => typeof c === "string" && c.length > 0)
              .slice(0, 12)
              .map((c) => c.slice(0, 40)),
          }
        : {}),
    };
    try {
      const lista = await registrarAceite(aceite);
      for (const p of TELAS) revalidatePath(p);
      return NextResponse.json({ ok: true, aceites: lista.length });
    } catch (e) {
      return NextResponse.json({ erro: String(e) }, { status: 503 });
    }
  }

  // Recusa é sobre o que está na tela: exige o item no acervo.
  if (!item) return NextResponse.json({ erro: `sinal ${id} não encontrado` }, { status: 404 });
  if (!motivo || !(motivo in MOTIVOS)) {
    return NextResponse.json(
      { erro: "motivo inválido", aceitos: Object.keys(MOTIVOS) },
      { status: 400 },
    );
  }

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
    for (const p of TELAS) revalidatePath(p);
    return NextResponse.json({ ok: true, recusas: lista.length });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 503 });
  }
}

/** Desfaz uma recusa. Errar o clique não pode custar a pauta. */
export async function DELETE(req: Request) {
  if (!autorizadoNoContrato(req)) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "faltou o id" }, { status: 400 });
  try {
    const lista = await desfazerRecusa(id);
    for (const p of TELAS) revalidatePath(p);
    return NextResponse.json({ ok: true, recusas: lista.length });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 503 });
  }
}

export async function GET(req: Request) {
  if (!autorizadoNoContrato(req)) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const [recusas, aceites] = await Promise.all([lerRecusas(), lerAceites()]);
  return NextResponse.json(
    { total: recusas.length, recusas, aceites },
    { headers: { "Cache-Control": "no-store" } },
  );
}
