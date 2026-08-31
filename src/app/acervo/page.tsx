import Link from "next/link";
import { carregarAcervo, pontuar } from "@/dados/acervo";
import { MODO_ROTULO } from "@/core/mente";
import { corDaRelevancia, corDoModo } from "@/ui/selos";

// 15 minutos. Precisa ser literal: o Next lê isto estaticamente.
export const revalidate = 900;

type Busca = { q?: string; rel?: string; fonte?: string; tipo?: string };

/**
 * O acervo inteiro.
 *
 * Tudo o que foi observado continua aqui, inclusive o que foi recusado.
 * Recusa registrada é memória: impede o Cérebro de reabrir a mesma discussão.
 */
export default async function Acervo({ searchParams }: { searchParams: Promise<Busca> }) {
  const { q, rel, fonte, tipo } = await searchParams;
  const acervo = await carregarAcervo();
  const ctx = { hoje: acervo.hoje };

  const fontes = [...new Set(acervo.itens.map((i) => i.fonte))].sort();
  const tipos = [...new Set(acervo.itens.map((i) => i.tipo))].sort();

  let pontuados = pontuar(acervo.itens, ctx);
  if (q) {
    const alvo = q.toLowerCase();
    pontuados = pontuados.filter((p) =>
      `${p.item.titulo} ${p.item.resumo} ${p.item.fonte}`.toLowerCase().includes(alvo),
    );
  }
  if (rel) pontuados = pontuados.filter((p) => p.item.rel === rel);
  if (fonte) pontuados = pontuados.filter((p) => p.item.fonte === fonte);
  if (tipo) pontuados = pontuados.filter((p) => p.item.tipo === tipo);

  const mostrar = pontuados.slice(0, 120);

  return (
    <>
      <div className="titulo-secao">
        <div>
          <h2>Acervo — {acervo.totais.itens} sinais</h2>
          <p>Inclusive o que foi recusado. A recusa registrada também é memória.</p>
        </div>
        <span className="selo">{pontuados.length} no filtro</span>
      </div>

      <form className="barra-filtros" method="get">
        <input type="search" name="q" defaultValue={q ?? ""} placeholder="Buscar título, resumo, fonte…" />
        <select name="rel" defaultValue={rel ?? ""}>
          <option value="">relevância</option>
          <option value="alta">alta</option>
          <option value="media">media</option>
          <option value="baixa">baixa</option>
        </select>
        <select name="fonte" defaultValue={fonte ?? ""}>
          <option value="">fonte</option>
          {fontes.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select name="tipo" defaultValue={tipo ?? ""}>
          <option value="">tipo</option>
          {tipos.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button className="btn p" type="submit">Filtrar</button>
        <Link className="btn" href="/acervo">Limpar</Link>
      </form>

      <div className="lista">
        {mostrar.map(({ item, score }) => (
          <article className="linha" key={item.id}>
            <div className="meta">
              <span className={`selo ${corDaRelevancia(item.rel)}`}>{item.rel}</span>
              <span className={`selo ${corDoModo(score.modo)}`}>{MODO_ROTULO[score.modo]}</span>
              <span>{item.fonte}</span>
              <span>· {item.tipo}</span>
              <span>· {item.quando}</span>
              <span>· {score.total}/100</span>
            </div>
            <h3>{item.titulo}</h3>
            <p className="mini muted" style={{ margin: 0 }}>
              {item.resumo.slice(0, 240)}
            </p>
            <p className="mini" style={{ margin: "7px 0 0" }}>
              <a href={item.url} target="_blank" rel="noreferrer noopener">Abrir na fonte ↗</a>
              {" · "}
              <Link href={`/jornal#${item.id}`}>ver no Jornal</Link>
            </p>
          </article>
        ))}
      </div>

      {pontuados.length > mostrar.length && (
        <p className="muted mini" style={{ marginTop: 14 }}>
          Mostrando {mostrar.length} de {pontuados.length}. Use a busca para chegar no resto.
        </p>
      )}
    </>
  );
}
