import type { Metadata } from "next";
import { carregarAcervo } from "@/dados/acervo";
import { Abas } from "@/ui/Abas";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cérebro CVRJ — notícias que merecem atenção",
  description:
    "Observa, entende e decide. Não publica. Cruz Vermelha Brasileira — Filial Rio de Janeiro.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const acervo = await carregarAcervo();
  const t = acervo.totais;

  return (
    <html lang="pt-BR">
      <body>
        <header className="mast">
          <div className="mast-topo">
            <div>
              <div className="sobrancelha">
                Cruz Vermelha Brasileira · Filial Rio de Janeiro
              </div>
              <h1>Cérebro de Notícias</h1>
              <p className="sub">
                Das centenas de coisas observadas, <b>estas poucas merecem sua atenção</b> — e
                estas duas devem entrar no calendário. O Cérebro não publica.
              </p>
            </div>
            <div className="kpis">
              <div className="kpi"><b>{t.itens}</b><span>sinais</span></div>
              <div className="kpi"><b>{t.alta}</b><span>relevância alta</span></div>
              <div className="kpi"><b>{t.propostas}</b><span>peças sugeridas</span></div>
              <div className="kpi"><b>{t.datas}</b><span>datas</span></div>
              <div className="kpi"><b>{t.fontes_ok}/{t.fontes}</b><span>fontes no ar</span></div>
            </div>
          </div>
          <Abas />
        </header>
        <main>{children}</main>
        <footer className="rodape">
          {acervo.metodo} · coleta {acervo.hoje} · gerado{" "}
          {new Date(acervo.gerado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} ·
          origem <b>{acervo.origem === "apify" ? "Apify (ao vivo)" : "acervo semente do repositório"}</b>
        </footer>
      </body>
    </html>
  );
}
