import type { Aceite, Recusa } from "@/core/tipos";
import { CHAVE_ACERVO, KV_STORE, gravarKV, lerKV, temToken } from "@/apify/cliente";

/**
 * A memória das decisões humanas.
 *
 * Um Cérebro que sugere sempre as mesmas coisas depois de ouvir "não" não é
 * um assistente, é um despertador. Cada recusa é guardada com o motivo, e o
 * motivo é o que ensina: "repetitivo" e "já falamos" derrubam ganchos
 * parecidos daquela conta; "não é da Cruz" derruba o assunto.
 *
 * O "sim" também fica: o que a Redação pautou e publicou a partir daqui. Sem
 * ele o Cérebro seguia sugerindo o que a Casa acabara de publicar.
 *
 * Fica no mesmo Key-Value Store do acervo, em chaves próprias — a coleta
 * reescreve o acervo a cada run e levaria a memória junto.
 */
export const CHAVE_FEEDBACK = "feedback";
export const CHAVE_ACEITES = "aceites";

/** Teto de registros guardados. Os mais antigos saem primeiro. */
const TETO = 500;
const TETO_ACEITES = 1000;

/**
 * Uma recusa não vale para sempre. O item que a motivou sai do acervo em
 * semanas; a lição sobre a fonte esfria no motor (meia-vida de três semanas).
 * Depois de três meses ela é só ruído na memória.
 */
const VALIDADE_RECUSA_DIAS = 90;

export async function lerRecusas(agora: number = Date.now()): Promise<Recusa[]> {
  if (!temToken() || !KV_STORE) return [];
  try {
    const todas = (await lerKV<Recusa[]>(KV_STORE, CHAVE_FEEDBACK, true)) ?? [];
    const corte = agora - VALIDADE_RECUSA_DIAS * 86_400_000;
    return todas.filter((r) => {
      const t = Date.parse(r.quando);
      return Number.isNaN(t) || t >= corte;
    });
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

export async function lerAceites(): Promise<Aceite[]> {
  if (!temToken() || !KV_STORE) return [];
  try {
    return (await lerKV<Aceite[]>(KV_STORE, CHAVE_ACEITES, true)) ?? [];
  } catch {
    return [];
  }
}

/**
 * Registra um "sim". O mesmo sinal pode ser pautado e depois publicado — são
 * dois eventos. Repetir o mesmo evento do mesmo sinal atualiza url, canais e
 * pacote, mas guarda a PRIMEIRA data: a Redação reenvia "publicado" a cada
 * recontagem de status, e é a data original que mede "há quantos dias a Casa
 * publicou".
 */
export async function registrarAceite(novo: Aceite): Promise<Aceite[]> {
  if (!temToken() || !KV_STORE) throw new Error("Apify não configurada");
  const atuais = await lerAceites();
  const anterior = atuais.find((a) => a.id === novo.id && a.evento === novo.evento);
  const registro =
    anterior && Date.parse(anterior.quando) < Date.parse(novo.quando) ? { ...novo, quando: anterior.quando } : novo;
  const semDuplicata = atuais.filter((a) => a !== anterior);
  const lista = [registro, ...semDuplicata].slice(0, TETO_ACEITES);
  await gravarKV(KV_STORE, CHAVE_ACEITES, lista);
  return lista;
}

export { CHAVE_ACERVO };
