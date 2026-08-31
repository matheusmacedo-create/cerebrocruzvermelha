"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/", rotulo: "Hoje" },
  { href: "/jornal", rotulo: "Jornal" },
  { href: "/acervo", rotulo: "Acervo" },
  { href: "/calendario", rotulo: "Calendário" },
  { href: "/fontes", rotulo: "Fontes" },
];

export function Abas() {
  const caminho = usePathname();
  return (
    <nav className="abas">
      {ABAS.map((a) => (
        <Link key={a.href} href={a.href} className={caminho === a.href ? "on" : ""}>
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}
