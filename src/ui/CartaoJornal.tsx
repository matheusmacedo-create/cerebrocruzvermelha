import type { Item, Score } from "@/core/tipos";
import { MODO_ROTULO, VEREDITO_ROTULO } from "@/core/mente";
import { DIREITO_EXPLICACAO, credito, direitoDe, podePublicar } from "@/core/direito";
import { CANAL_ROTULO, planoDeCanais, proibicoes } from "@/core/canais";
import { resolverConta } from "@/core/contas";
import { corDoDireito, corDoModo, corDoVeredito } from "./selos";
import { Barras } from "./Barras";
import { Midia } from "./Midia";
import { semORepetido } from "./texto";

/**
 * O cartão do Jornal.
 *
 * Mostra a mídia da fonte como contexto de triagem — com o selo de direito
 * bem visível — e o plano por canal logo abaixo. A mídia de terceiro
 * aparece aqui e para aqui: ela não segue para a peça.
 */
export function CartaoJornal({ item, score, semelhantes = 0 }: { item: Item; score: Score; semelhantes?: number }) {
  const d = direitoDe(item);
  const conta = resolverConta(item);
  const canais = planoDeCanais(item, score);
  const naoPode = proibicoes(item);
  const publicavel = podePublicar(d);

  return (
    <article className="card" id={item.id} style={{ scrollMarginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className={`selo ${corDoModo(score.modo)}`}>{MODO_ROTULO[score.modo]}</span>
          <span className={`selo ${corDoVeredito(score.veredito)}`}>{VEREDITO_ROTULO[score.veredito]}</span>
          <span className={`selo ${corDoDireito(d)}`} title={DIREITO_EXPLICACAO[d]}>
            {d}
          </span>
          {item.midia && <span className="selo escuro">{item.midia.formato}</span>}
          {semelhantes > 0 && (
            <span className="selo azul" title="Boletins semelhantes desta conta, agrupados. Este é o de maior nota.">
              +{semelhantes} agrupados
            </span>
          )}
        </div>
        <span className="muted mini">
          {conta?.instagram ?? item.fonte} · {score.total}/100
        </span>
      </div>

      {item.midia && (
        <div style={{ marginTop: 11 }}>
          <Midia id={item.id} midia={item.midia} credito={credito(item)} altura={300} href={item.url} inteira />
        </div>
      )}

      <h2 style={{ marginTop: 11 }}>{item.titulo}</h2>
      <p className="mini muted">{semORepetido(item.titulo, item.resumo).slice(0, 320)}</p>

      <div className="porque">
        <b>Como o Cérebro leu isso.</b>
        <ul>
          {score.porque.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>

      <div className="sep" />
      <Barras score={score} />

      <div className="sep" />
      <div className="sobrancelha muted" style={{ marginBottom: 8 }}>
        Plano por canal — {publicavel ? "mídia própria autorizada" : "sem levar a mídia da fonte"}
      </div>
      <div className="grade g2">
        {canais.map((c) => (
          <div className={`canal ${c.usar ? "" : "nao"}`} key={c.canal}>
            <div className="canal-topo">
              <b>{CANAL_ROTULO[c.canal]}</b>
              <span className={`selo ${c.usar ? "verde" : "baixa"}`}>{c.usar ? "usar" : "não usar"}</span>
            </div>
            <dl>
              <dt>Formato</dt>
              <dd>{c.formato}</dd>
              <dt>Mídia certa</dt>
              <dd>{c.midia}</dd>
              <dt>Encaminhamento</dt>
              <dd>{c.cta}</dd>
            </dl>
            <p>{c.texto}</p>
          </div>
        ))}
      </div>

      <div className="proibido">
        <b>Não pode.</b>
        <ul>
          {naoPode.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 11 }}>
        <a className="btn" href={item.url} target="_blank" rel="noreferrer noopener">
          Ver na fonte
        </a>{" "}
        <a className="btn" href={`/api/pauta?id=${item.id}`} target="_blank" rel="noreferrer noopener">
          Exportar pauta para a Redação
        </a>
      </div>
    </article>
  );
}
