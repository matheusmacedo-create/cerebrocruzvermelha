import { NextResponse } from "next/server";
import { ACTOR_INSTAGRAM, rodarActor, temToken } from "@/apify/cliente";
import { inputInstagram, type Cadencia } from "@/apify/input";

export const dynamic = "force-dynamic";

const CADENCIAS: Cadencia[] = ["tempo_real", "diario", "3_dias", "10_dias"];

/**
 * Dispara a coleta na Apify.
 *
 * Chamada pelo Cron da Vercel (GET, com o header do Vercel Cron) ou à mão
 * com o segredo. A run é assíncrona: quem monta o snapshot é o webhook.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const cadencia = (url.searchParams.get("cadencia") ?? "tempo_real") as Cadencia;

  if (!autorizado(req)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!CADENCIAS.includes(cadencia)) {
    return NextResponse.json({ erro: `cadência inválida: ${cadencia}` }, { status: 400 });
  }
  if (!temToken()) {
    return NextResponse.json({ erro: "APIFY_TOKEN não configurado" }, { status: 503 });
  }

  const input = inputInstagram(cadencia);
  if (input.username.length === 0) {
    return NextResponse.json({ ok: true, cadencia, nota: "nenhuma conta nesta cadência" });
  }

  try {
    const run = await rodarActor(ACTOR_INSTAGRAM, input);
    return NextResponse.json({
      ok: true,
      cadencia,
      perfis: input.username.length,
      desde: input.onlyPostsNewerThan,
      runId: run.id,
      datasetId: run.defaultDatasetId,
    });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 502 });
  }
}

function autorizado(req: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  // Sem segredo configurado, a rota fica aberta apenas fora de produção.
  if (!segredo) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${segredo}`;
}
