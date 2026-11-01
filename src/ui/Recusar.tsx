"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MOTIVOS, type MotivoRecusa } from "@/core/tipos";
import { recusarSinal } from "@/app/acoes";

/**
 * Recusar uma sugestão.
 *
 * O motivo não é burocracia: é o que o Cérebro aprende. "Repetitivo" faz ele
 * recuar naquela fonte; "não é da Cruz" derruba o assunto. Recusar sem dizer
 * por quê só esconderia o cartão, e amanhã ele voltaria igual.
 *
 * A vaga é preenchida na hora pelo próximo candidato — a tela recarrega em vez
 * de ficar com um buraco onde estava a sugestão.
 */
export function Recusar({ id, titulo }: { id: string; titulo: string }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, comecar] = useTransition();
  const router = useRouter();

  async function recusar(motivo: MotivoRecusa) {
    setErro(null);
    try {
      // Server Action, e não fetch em /api/feedback: a API tem porta
      // (PAUTA_TOKEN) e a tela não carrega segredo.
      const r = await recusarSinal(id, motivo);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setAberto(false);
      comecar(() => router.refresh());
    } catch {
      setErro("Sem conexão com o servidor. A recusa não foi registrada.");
    }
  }

  if (!aberto) {
    return (
      <button className="btn" onClick={() => setAberto(true)} disabled={enviando}>
        {enviando ? "Trocando…" : "Não usar"}
      </button>
    );
  }

  return (
    <div className="recusa">
      <p className="sobrancelha">Por que não usar?</p>
      <div className="recusa-motivos">
        {(Object.keys(MOTIVOS) as MotivoRecusa[]).map((m) => (
          <button key={m} className="chip" title={MOTIVOS[m].explica} onClick={() => recusar(m)}>
            {MOTIVOS[m].rotulo}
          </button>
        ))}
      </div>
      {erro && <p className="recusa-erro">{erro}</p>}
      <button className="btn" onClick={() => { setAberto(false); setErro(null); }}>
        Cancelar
      </button>
      <span className="sr-only">Recusando: {titulo}</span>
    </div>
  );
}
