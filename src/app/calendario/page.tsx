import { carregarAcervo } from "@/dados/acervo";
import { MODO_ROTULO } from "@/core/mente";
import type { Modo } from "@/core/tipos";

// 15 minutos. Precisa ser literal: o Next lê isto estaticamente.
export const revalidate = 900;

/**
 * Dois calendários, não um.
 *
 * Oportunidades: o que poderia ser usado, sem obrigar produção.
 * Peças sugeridas: o que o Cérebro propõe, com gancho, formatos e proibições.
 * O que vira compromisso é decisão da Redação, não daqui.
 */
export default async function Calendario() {
  const acervo = await carregarAcervo();

  const futuras = acervo.calendario
    .filter((d) => d.dias >= -7)
    .sort((a, b) => a.dias - b.dias);

  const propostas = [...acervo.propostas].sort((a, b) => a.dias - b.dias);

  return (
    <>
      <div className="aviso">
        <div style={{ fontSize: 24 }}>🗓️</div>
        <div>
          <strong>Aqui existem dois calendários diferentes.</strong>
          <br />
          <b>Oportunidades</b> mostram o que poderia ser usado. <b>Peças sugeridas</b> são a
          proposta do Cérebro. Nenhum dos dois é compromisso — compromisso nasce na Redação.
        </div>
      </div>

      <div className="titulo-secao">
        <div>
          <h2>Peças sugeridas — {propostas.length}</h2>
          <p>Cada uma com gancho, formatos, encaminhamento e o que não pode.</p>
        </div>
      </div>

      <div className="grade g2">
        {propostas.map((p) => (
          <article className="card" key={p.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span className={`selo ${corModo(p.modo)}`}>{MODO_ROTULO[p.modo] ?? p.modo}</span>
              <span className="muted mini">
                {p.data} · {p.dias === 0 ? "hoje" : p.dias > 0 ? `em ${p.dias} dias` : `há ${-p.dias} dias`}
              </span>
            </div>
            <h3 style={{ marginTop: 8 }}>{p.titulo}</h3>
            <p className="mini muted">{p.gancho}</p>

            <div className="sep" />
            <div className="sobrancelha muted">Peças</div>
            {p.pecas.map((peca, i) => (
              <div className="canal" key={i} style={{ marginTop: 6 }}>
                <div className="canal-topo">
                  <b>{peca.formato}</b>
                  <span className="selo">{peca.quando}</span>
                </div>
                <p>{peca.peca}</p>
              </div>
            ))}

            <div className="proibido">
              <b>Não pode.</b>
              <ul>
                {p.proibido.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>

            <p className="mini" style={{ marginTop: 9 }}>
              <b>Encaminhamento:</b> {p.cta}
            </p>

            {p.fontes_ligadas.length > 0 && (
              <>
                <div className="sep" />
                <div className="sobrancelha muted">Fontes ligadas</div>
                <ul className="mini muted" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {p.fontes_ligadas.slice(0, 4).map((f, i) => (
                    <li key={i}>
                      <a href={f.url} target="_blank" rel="noreferrer noopener">
                        {f.titulo}
                      </a>{" "}
                      — {f.fonte}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </article>
        ))}
      </div>

      <div className="titulo-secao">
        <div>
          <h2>Calendário de oportunidades — {futuras.length} datas</h2>
          <p>Datas e temporadas. Estar aqui não obriga a produzir.</p>
        </div>
      </div>

      <div className="lista">
        {futuras.map((d) => (
          <article className="linha" key={d.data + d.titulo}>
            <div className="meta">
              <span className={`selo ${d.prioridade === "alta" ? "alta" : d.prioridade === "media" ? "media" : "baixa"}`}>
                {d.prioridade}
              </span>
              <span>{d.data}</span>
              <span>· {d.weekday}</span>
              <span>· {d.tipo.replace(/_/g, " ")}</span>
              <span>· {d.dias === 0 ? "hoje" : d.dias > 0 ? `em ${d.dias} dias` : `há ${-d.dias} dias`}</span>
            </div>
            <h3>{d.titulo}</h3>
            <p className="mini muted" style={{ margin: 0 }}>{d.angulo}</p>
            <p className="mini" style={{ margin: "6px 0 0" }}>
              <b>Preparar a partir de {d.preparar}</b> · formatos: {d.formatos.join(", ")}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}

function corModo(m: Modo | string): string {
  if (m === "produzir" || m === "agir_agora") return "vermelho";
  if (m === "agendar") return "ambar";
  if (m === "avaliar") return "ambar";
  if (m === "folga_ou_plantao") return "azul";
  return "verde";
}
