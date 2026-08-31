"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MOTIVOS, type MotivoRecusa } from "@/core/tipos";

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
      const r = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, motivo }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { erro?: string };
        setErro(d.erro ?? "Não deu para registrar. Tente de novo.");
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
