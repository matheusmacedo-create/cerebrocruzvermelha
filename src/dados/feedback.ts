import type { Recusa } from "@/core/tipos";
import { CHAVE_ACERVO, KV_STORE, gravarKV, lerKV, temToken } from "@/apify/cliente";

/**
 * A memória das recusas.
 *
 * Um Cérebro que sugere sempre as mesmas coisas depois de ouvir "não" não é
 * um assistente, é um despertador. Cada recusa é guardada com o motivo, e o
 * motivo é o que ensina: "repetitivo" e "já falamos" derrubam ganchos
 * parecidos daquela conta; "não é da Cruz" derruba o assunto.
 *
 * Fica no mesmo Key-Value Store do acervo, em chave própria — a coleta
 * reescreve o acervo a cada run e levaria as recusas junto.
 */
export const CHAVE_FEEDBACK = "feedback";

/** Teto de recusas guardadas. As mais antigas saem primeiro. */
const TETO = 500;

export async function lerRecusas(): Promise<Recusa[]> {
  if (!temToken() || !KV_STORE) return [];
  try {
    return (await lerKV<Recusa[]>(KV_STORE, CHAVE_FEEDBACK, true)) ?? [];
  } catch {
    // Uma falha aqui não pode derrubar a tela: sem memória de recusa o
    // Cérebro volta a sugerir demais, o que é ruim, mas não é quebrado.
    return [];
  }
}

export async function registrarRecusa(nova: Recusa): Promise<Recusa[]> {
  if (!temToken() || !KV_STORE) throw new Error("Apify não configurada");
  const atuais = await lerRecusas();
  // Recusar de novo o mesmo sinal atualiza o motivo em vez de duplicar.
  const semDuplicata = atuais.filter((r) => r.id !== nova.id);
  const lista = [nova, ...semDuplicata].slice(0, TETO);
  await gravarKV(KV_STORE, CHAVE_FEEDBACK, lista);
  return lista;
}

export async function desfazerRecusa(id: string): Promise<Recusa[]> {
  if (!temToken() || !KV_STORE) throw new Error("Apify não configurada");
  const lista = (await lerRecusas()).filter((r) => r.id !== id);
  await gravarKV(KV_STORE, CHAVE_FEEDBACK, lista);
  return lista;
}

export { CHAVE_ACERVO };
