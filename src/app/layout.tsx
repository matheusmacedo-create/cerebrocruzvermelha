import type { Metadata, Viewport } from "next";
import { Libre_Franklin } from "next/font/google";
import { carregarAcervo } from "@/dados/acervo";
import { Marca } from "@/ui/Marca";
import { Navegacao } from "@/ui/Navegacao";
import { Topo } from "@/ui/Topo";
import "./globals.css";

// A mesma família do Redação: os dois ambientes precisam ler como um só.
const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-libre-franklin",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cérebro de Notícias — Cruz Vermelha Brasileira Rio de Janeiro",
  description:
    "Radar de notícias da Cruz Vermelha Brasileira — Rio de Janeiro. Observa, entende e decide o que merece virar pauta. Não publica.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const acervo = await carregarAcervo();

  return (
    <html lang="pt-BR" className={libreFranklin.variable}>
      <body>
        <div className="casca">
          <aside className="lateral">
            <div className="lateral-topo">
              <Marca />
            </div>
            <Navegacao />
            <div className="lateral-rodape">
              Regras e cruzamento lexical sobre lista fechada. Sem modelo generativo.
              <br />
              Atualizado {new Date(acervo.gerado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
            </div>
          </aside>
          <div className="coluna">
            <Topo acervo={acervo} />
            <main>
              <div className="conteudo">{children}</div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
