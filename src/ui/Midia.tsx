"use client";

import { useState } from "react";
import type { Direito, MidiaItem } from "@/core/tipos";

/**
 * A mídia de um sinal.
 *
 * Serve do cache do próprio app (/api/midia/[id]), não da CDN do Instagram —
 * aquelas URLs expiram em poucos dias. Se mesmo assim não vier, mostra a
 * marcação em vez de um ícone de imagem quebrada: o cartão continua legível
 * e a pessoa vê que a mídia existiu.
 *
 * O selo de direito fica sobre a imagem de propósito. Quem bate o olho
 * precisa saber, antes de querer usar, que aquilo não pode ser publicado.
 */
export function Midia({
  id,
  midia,
  credito,
  altura,
  href,
  inteira = false,
}: {
  id: string;
  midia: MidiaItem;
  credito: string;
  altura: number;
  href?: string;
  /** Mostra a capa inteira em vez de recortada. Use quando ela carrega texto. */
  inteira?: boolean;
}) {
  const [falhou, setFalhou] = useState(false);
  const ehVideo = midia.tipo === "video" || midia.formato === "reels";

  const conteudo = falhou ? (
    <div className="midia-vazia">
      mídia indisponível
      <span>a fonte expirou o arquivo</span>
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/midia/${id}`} alt="" loading="lazy" onError={() => setFalhou(true)} />
  );

  const corpo = (
    <>
      {conteudo}
      {ehVideo && !falhou && (
        <span className="play" aria-hidden="true">
          <i />
        </span>
      )}
      <span className={`midia-direito ${classeDireito(midia.direito)}`}>{midia.direito}</span>
      <span className="cred">{credito}</span>
    </>
  );

  return (
    <div className={`midia${inteira ? " inteira" : ""}`} style={{ height: altura }}>
      {href ? (
        <a
          className="midia-link"
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          title={ehVideo ? "Assistir na fonte" : "Ver na fonte"}
        >
          {corpo}
        </a>
      ) : (
        corpo
      )}
    </div>
  );
}

function classeDireito(d: Direito): string {
  if (d === "autorizado") return "pode";
  if (d === "casa" || d === "oficial" || d === "movimento") return "credito";
  return "nao";
}
