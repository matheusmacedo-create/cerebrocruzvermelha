import type { Score } from "@/core/tipos";

const LINHAS: { chave: keyof Score; rotulo: string; cor: string }[] = [
  { chave: "localidade", rotulo: "Localidade", cor: "azul" },
  { chave: "urgencia", rotulo: "Urgência", cor: "ambar" },
  { chave: "relacao", rotulo: "Relação CVRJ", cor: "verde" },
  { chave: "acaoReal", rotulo: "Ação real", cor: "" },
  { chave: "ineditismo", rotulo: "Ineditismo", cor: "azul" },
  { chave: "confianca", rotulo: "Confiança", cor: "verde" },
];

/** As seis perguntas da Mente, com a nota que cada uma deu. */
export function Barras({ score }: { score: Score }) {
  return (
    <div>
      {LINHAS.map((l) => {
        const v = score[l.chave] as number;
        return (
          <div className="nota-linha" key={l.chave}>
            <span>{l.rotulo}</span>
            <span className={`barra ${l.cor}`}>
              <i style={{ width: `${v}%` }} />
            </span>
            <b>{v}</b>
          </div>
        );
      })}
    </div>
  );
}
