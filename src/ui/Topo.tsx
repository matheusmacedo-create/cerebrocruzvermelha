import type { Acervo } from "@/core/tipos";

/**
 * A faixa de topo carrega o estado da coleta.
 *
 * Quem abre precisa saber, antes de qualquer número, se está olhando dado
 * vivo ou o acervo semente — uma tela que parece atual mas não é vale menos
 * que uma tela quebrada.
 */
export function Topo({ acervo }: { acervo: Acervo }) {
  const t = acervo.totais;
  const vivo = acervo.origem === "apify";
  return (
    <header className="topo">
      <div>
        <h1>Cérebro de Notícias</h1>
        <p className="sub">
          Observa, entende e decide. Não publica. · coleta {formatar(acervo.hoje)} ·{" "}
          <span className={`selo ${vivo ? "verde" : "ambar"}`}>
            {vivo ? "dado vivo" : "acervo semente"}
          </span>
        </p>
      </div>
      <div className="kpis">
        <div className="kpi"><b>{t.itens}</b><span>sinais</span></div>
        <div className="kpi"><b>{t.alta}</b><span>alta</span></div>
        <div className="kpi"><b>{t.propostas}</b><span>peças</span></div>
        <div className="kpi"><b>{t.datas}</b><span>datas</span></div>
        <div className="kpi"><b>{t.fontes_ok}/{t.fontes}</b><span>fontes</span></div>
      </div>
    </header>
  );
}

function formatar(iso: string): string {
  const [a, m, d] = iso.split("-");
  return d && m ? `${d}/${m}/${a}` : iso;
}
