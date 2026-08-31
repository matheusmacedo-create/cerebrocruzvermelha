import Link from "next/link";
import { carregarAcervo, pontuar } from "@/dados/acervo";
import { MODO_ROTULO } from "@/core/mente";
import { CONTAS } from "@/core/contas";
import { agrupar } from "@/core/agrupar";
import { corDoModo, faixaDeAtencao } from "@/ui/selos";
import { Barras } from "@/ui/Barras";

// 15 minutos. Precisa ser literal: o Next lê isto estaticamente.
export const revalidate = 900;

/**
 * Hoje.
 *
 * A tela de segunda-feira de manhã: ninguém abre 263 notícias.
 * O que aparece aqui é o que passou de 55 e ainda tem prazo.
 */
export default async function Hoje() {
  const acervo = await carregarAcervo();
  const ctx = { hoje: acervo.hoje };

  // Agrupa antes de escolher: boletim de hora em hora não pode ocupar a tela.
  const pontuados = agrupar(pontuar(acervo.itens, ctx));
  const atencao = pontuados
    .filter((p) => p.score.modo === "agir_agora" || p.score.modo === "produzir" || p.score.modo === "agendar")
    .slice(0, 6);

  const proximas = acervo.calendario
    .filter((d) => d.dias >= 0 && d.dias <= 45)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 5);

  const escondidos = acervo.itens.length - atencao.length;
  const recolhidos = pontuados.reduce((n, p) => n + p.semelhantes, 0);
  const emTempoReal = CONTAS.filter((c) => c.cadencia === "tempo_real").length;

  return (
    <>
      <div className="aviso">
        <div style={{ fontSize: 24 }}>🧠</div>
        <div>
          <strong>Leia esta tela como se fosse segunda-feira de manhã.</strong>
          <br />
          O Cérebro leu {acervo.totais.itens} sinais de {CONTAS.length} contas da lista fechada
          {emTempoReal > 0 ? ` (${emTempoReal} delas em tempo real)` : ""} e guardou {escondidos} no
          acervo{recolhidos > 0 ? `, agrupando ${recolhidos} boletins repetidos` : ""}. Estes{" "}
          {atencao.length} pedem decisão.
        </div>
      </div>

      <div className="titulo-secao">
        <div>
          <h2>O que precisa da sua atenção</h2>
          <p>O resto fica no acervo e não ocupa sua cabeça.</p>
        </div>
        <span className="selo vermelho">{atencao.length} itens</span>
      </div>

      {atencao.length === 0 ? (
        <div className="card">
          <h3>Nada exige decisão agora.</h3>
          <p className="muted mini">
            Nenhum sinal passou do corte. Isso é um resultado legítimo — o calendário segue como
            está. O <Link href="/acervo">acervo</Link> continua aberto.
          </p>
        </div>
      ) : (
        <div className="grade g2">
          {atencao.map(({ item, score, semelhantes }) => (
            <article className={`card atencao ${faixaDeAtencao(score.total)}`} key={item.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <span className={`selo ${corDoModo(score.modo)}`}>{MODO_ROTULO[score.modo]}</span>
                <span className="muted mini">
                  {item.fonte} · {score.total}/100
                  {semelhantes > 0 ? ` · +${semelhantes} semelhantes` : ""}
                </span>
              </div>
              <h2 style={{ marginTop: 8 }}>{item.titulo}</h2>
              <p className="mini muted">{item.resumo.slice(0, 190)}…</p>
              <div className="porque">
                <b>Por que apareceu?</b>
                <ul>
                  {score.porque.slice(0, 3).map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
              <div className="sep" />
              <Barras score={score} />
              <div style={{ marginTop: 10 }}>
                <Link className="btn p" href={`/jornal#${item.id}`}>
                  Abrir no Jornal
                </Link>{" "}
                <a className="btn" href={item.url} target="_blank" rel="noreferrer noopener">
                  Ver na fonte
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="titulo-secao">
        <div>
          <h2>O que vem no calendário</h2>
          <p>Data com antecedência não é urgência. É produção tranquila.</p>
        </div>
        <Link className="chip" href="/calendario">
          ver as {acervo.totais.datas} datas
        </Link>
      </div>
      <div className="grade g3">
        {proximas.map((d) => (
          <div className="card" key={d.data + d.titulo}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span className={`selo ${d.prioridade === "alta" ? "vermelho" : d.prioridade === "media" ? "ambar" : "azul"}`}>
                {d.prioridade}
              </span>
              <span className="muted mini">
                {d.dias === 0 ? "hoje" : `em ${d.dias} dias`}
              </span>
            </div>
            <h3 style={{ marginTop: 8 }}>{d.titulo}</h3>
            <p className="mini muted">{d.angulo}</p>
            <p className="mini">
              <b>Preparar a partir de {d.preparar}</b>
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
