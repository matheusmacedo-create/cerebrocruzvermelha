import { carregarAcervo } from "@/dados/acervo";
import { CATEGORIAS, CONTAS, SOMENTE_INTERNO } from "@/core/contas";
import { JANELA_HORAS } from "@/apify/input";
import type { Conta } from "@/core/tipos";

// 15 minutos. Precisa ser literal: o Next lê isto estaticamente.
export const revalidate = 900;

const CADENCIA_ROTULO: Record<Conta["cadencia"], string> = {
  tempo_real: "tempo real",
  diario: "diário",
  "3_dias": "3 dias",
  "10_dias": "10 dias",
};

/**
 * A lista fechada, exposta.
 *
 * Uma lista que decide o que a instituição vê precisa se justificar em público.
 * Cada linha traz o motivo de estar aqui e o cuidado que ela exige.
 */
export default async function Fontes() {
  const acervo = await carregarAcervo();
  const porCategoria = Object.keys(CATEGORIAS).map((k) => ({
    chave: k,
    ...CATEGORIAS[k],
    contas: CONTAS.filter((c) => c.categoria === k),
  }));

  return (
    <>
      <div className="aviso">
        <div style={{ fontSize: 24 }}>📋</div>
        <div>
          <strong>O Cérebro não lê a internet. Ele lê estas {CONTAS.length} contas.</strong>
          <br />
          Entrar e sair desta lista é decisão humana, feita no código e revisada. A cadência governa
          o custo da coleta na Apify.
        </div>
      </div>

      {porCategoria.map((cat) => (
        <section key={cat.chave}>
          <div className="titulo-secao">
            <div>
              <h2>{cat.rotulo}</h2>
              <p>{cat.descricao}</p>
            </div>
            <span className="selo">{cat.contas.length} contas</span>
          </div>
          <div className="grade g3">
            {cat.contas.map((c) => (
              <article className="card" key={c.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span className={`selo ${c.cadencia === "tempo_real" ? "vermelho" : "azul"}`}>
                    {CADENCIA_ROTULO[c.cadencia]}
                  </span>
                  {SOMENTE_INTERNO.has(c.id) && <span className="selo escuro">uso interno</span>}
                </div>
                <h3 style={{ marginTop: 8 }}>{c.nome}</h3>
                <p className="mini muted" style={{ margin: "4px 0" }}>
                  {c.instagram && (
                    <>
                      <a href={`https://instagram.com/${c.instagram.replace("@", "")}`} target="_blank" rel="noreferrer noopener">
                        {c.instagram}
                      </a>{" "}
                    </>
                  )}
                  {c.x && (
                    <a href={`https://x.com/${c.x.replace("@", "")}`} target="_blank" rel="noreferrer noopener">
                      {c.x}
                    </a>
                  )}
                </p>
                <p className="mini">{c.porque}</p>
                {c.cuidado && (
                  <div className="proibido">
                    <b>Cuidado.</b> {c.cuidado}
                  </div>
                )}
                <p className="mini muted" style={{ marginTop: 8, marginBottom: 0 }}>
                  Eixos: {c.eixos.join(", ").replace(/_/g, " ")} · janela de{" "}
                  {JANELA_HORAS[c.cadencia]}h
                </p>
              </article>
            ))}
          </div>
        </section>
      ))}

      <div className="titulo-secao">
        <div>
          <h2>Fontes documentais — {acervo.saude.length}</h2>
          <p>RSS, APIs e diários oficiais. Estado da última coleta.</p>
        </div>
        <span className="selo verde">{acervo.totais.fontes_ok} no ar</span>
      </div>
      <div className="lista">
        {acervo.saude.map((s) => (
          <article className="linha" key={s.fonte}>
            <div className="meta">
              <span className={`selo ${s.ok ? "verde" : "alta"}`}>{s.ok ? "no ar" : "fora"}</span>
              <span>{s.itens} itens</span>
            </div>
            <h3 style={{ marginBottom: 4 }}>{s.fonte}</h3>
            <p className="mini muted" style={{ margin: 0 }}>{s.detalhe}</p>
            <p className="mini" style={{ margin: "5px 0 0", wordBreak: "break-all" }}>
              <a href={s.url} target="_blank" rel="noreferrer noopener">{s.url}</a>
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
