import Image from "next/image";

/**
 * A marca, no mesmo desenho do Redação: o logo oficial, um fio e o nome do
 * sistema. É o que faz alguém reconhecer que Cérebro e Redação são a mesma
 * casa — o logo sozinho não diz em qual dos dois você está.
 */
export function Marca() {
  return (
    <div className="marca">
      <Image
        src="/images/logo-cvrj.png"
        alt="Cruz Vermelha Brasileira — Rio de Janeiro"
        width={1844}
        height={752}
        priority
        sizes="200px"
      />
      <div className="sistema" aria-label="Identificação do sistema">
        <span aria-hidden="true" />
        <p>Cérebro — Radar de Notícias</p>
      </div>
    </div>
  );
}
