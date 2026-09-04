"use server";

import { revalidatePath } from "next/cache";
import { MOTIVOS, type MotivoRecusa, type Recusa } from "@/core/tipos";
import { carregarAcervo } from "@/dados/acervo";
import { desfazerRecusa, registrarRecusa } from "@/dados/feedback";

/**
 * As decisões humanas tomadas nas telas do próprio Cérebro.
 *
 * Antes a tela chamava /api/feedback pelo navegador; quando o contrato
 * ganhou porta (PAUTA_TOKEN), a tela ficaria do lado de fora. Server Action
 * grava direto na memória — o token protege a API para quem vem de fora, e a
 * tela continua funcionando.
 */

const TELAS = ["/", "/jornal", "/acervo"];

export async function recusarSinal(id: string, motivo: MotivoRecusa): Promise<{ erro?: string }> {
  if (!/^[a-zA-Z0-9_-]{4,64}$/.test(id)) return { erro: "Identificador do sinal inválido." };
  if (!(motivo in MOTIVOS)) return { erro: "Escolha um dos motivos." };

  const acervo = await carregarAcervo();
  const item = acervo.itens.find((i) => i.id === id);
  if (!item) return { erro: "Este sinal não está mais no acervo." };

  const recusa: Recusa = {
    id: item.id,
    motivo,
    titulo: item.titulo,
    contaId: item.contaId,
    fonte: item.fonte,
    quando: new Date().toISOString(),
  };
  try {
    await registrarRecusa(recusa);
  } catch (e) {
    return { erro: `Não deu para registrar: ${String(e)}` };
  }
  for (const p of TELAS) revalidatePath(p);
  return {};
}

export async function desfazerRecusaDoSinal(id: string): Promise<{ erro?: string }> {
  if (!/^[a-zA-Z0-9_-]{4,64}$/.test(id)) return { erro: "Identificador do sinal inválido." };
  try {
    await desfazerRecusa(id);
  } catch (e) {
    return { erro: `Não deu para desfazer: ${String(e)}` };
  }
  for (const p of TELAS) revalidatePath(p);
  return {};
}
