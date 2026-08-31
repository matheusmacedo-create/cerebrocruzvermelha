import Link from "next/link";
import { carregarAcervo, pontuar } from "@/dados/acervo";
import { CATEGORIAS, resolverConta } from "@/core/contas";
import { CartaoJornal } from "@/ui/CartaoJornal";

// 15 minutos. Precisa ser literal: o Next lê isto estaticamente.
export const revalidate = 900;

type Busca = { categoria?: string; veredito?: string };

/**
 * O Jornal de triagem.
 *
 * Cada sinal chega com veredito, direito de imagem e plano por canal.
 * A decisão continua sendo humana — o Cérebro só chega com o dever de casa feito.
 */
export default async function Jornal({ searchParams }: { searchParams: Promise<Busca> }) {
  const { categoria, veredito } = await searchParams;
  const acervo = await carregarAcervo();
  const ctx = { hoje: acervo.hoje };

  let pontuados = pontuar(acervo.itens, ctx);
  if (categoria) {
    pontuados = pontuados.filter((p) => {
      const c = resolverConta(p.item);
      return (c?.categoria ?? p.item.grupo) === categoria;
    });
  }
  if (veredito) pontuados = pontuados.filter((p) => p.score.veredito === veredito);

  const mostrar = pontuados.slice(0, 40);

  const chip = (href: string, rotulo: string, ativo: boolean) => (
    <Link key={href} className={`chip ${ativo ? "on" : ""}`} href={href}>
      {rotulo}
    </Link>
  );

  return (
    <>
      <div className="aviso">
        <div style={{ fontSize: 24 }}>📰</div>
        <div>
          <strong>A mídia da fonte é contexto de triagem, não material de publicação.</strong>
          <br />
          Ela aparece para você decidir. Só o que estiver marcado como <b>autorizado</b> pode entrar
          numa peça da filial. Fontes de uso interno — segurança e mobilidade — nunca viram conteúdo
          público.
        </div>
      </div>

      <div className="barra-filtros">
        {chip("/jornal", "Tudo", !categoria && !veredito)}
        {Object.entries(CATEGORIAS).map(([k, v]) =>
          chip(`/jornal?categoria=${k}`, v.rotulo, categoria === k),
        )}
        <span style={{ width: 12 }} />
        {chip("/jornal?veredito=sim", "Vira matéria", veredito === "sim")}
        {chip("/jornal?veredito=quase", "Quase", veredito === "quase")}
        <span className="muted mini">{pontuados.length} sinais</span>
      </div>

      {mostrar.length === 0 ? (
        <div className="card">
          <h3>Nenhum sinal neste recorte.</h3>
          <p className="muted mini">
            Tente outro filtro ou volte para <Link href="/jornal">tudo</Link>.
          </p>
        </div>
      ) : (
        <div className="lista" style={{ gap: 14 }}>
          {mostrar.map(({ item, score }) => (
            <CartaoJornal key={item.id} item={item} score={score} />
          ))}
        </div>
      )}

      {pontuados.length > mostrar.length && (
        <p className="muted mini" style={{ marginTop: 14 }}>
          Mostrando os {mostrar.length} de maior nota. Os outros {pontuados.length - mostrar.length}{" "}
          estão no <Link href="/acervo">acervo</Link>.
        </p>
      )}
    </>
  );
}
