import { NextResponse } from "next/server";
import { carregarAcervo } from "@/dados/acervo";
import { CONTAS } from "@/core/contas";
import { temToken, KV_STORE } from "@/apify/cliente";

export const dynamic = "force-dynamic";

/** Diagnóstico rápido: de onde o Cérebro está lendo agora. */
export async function GET() {
  const acervo = await carregarAcervo();
  return NextResponse.json({
    ok: true,
    origem: acervo.origem,
    apify: { token: temToken(), kvStore: Boolean(KV_STORE) },
    contas: CONTAS.length,
    coleta: acervo.hoje,
    geradoEm: acervo.gerado_em,
    totais: acervo.totais,
    fontesFora: acervo.saude.filter((s) => !s.ok).map((s) => s.fonte),
  });
}
