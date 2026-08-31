"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, CalendarDays, LayoutDashboard, Newspaper, Radio } from "lucide-react";

const SECOES = [
  {
    rotulo: "Decidir",
    itens: [
      { href: "/", rotulo: "Hoje", Icone: LayoutDashboard },
      { href: "/jornal", rotulo: "Jornal", Icone: Newspaper },
    ],
  },
  {
    rotulo: "Consultar",
    itens: [
      { href: "/acervo", rotulo: "Acervo", Icone: Archive },
      { href: "/calendario", rotulo: "Calendário", Icone: CalendarDays },
    ],
  },
  {
    rotulo: "Origem",
    itens: [{ href: "/fontes", rotulo: "Fontes", Icone: Radio }],
  },
];

export function Navegacao() {
  const caminho = usePathname();
  // "/" só casa exato; o resto casa por prefixo, para subpáginas manterem o item aceso.
  const ativo = (href: string) => (href === "/" ? caminho === href : caminho.startsWith(href));

  return (
    <nav>
      {SECOES.map((s) => (
        <div className="grupo" key={s.rotulo}>
          <p>{s.rotulo}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {s.itens.map(({ href, rotulo, Icone }) => (
              <Link key={href} href={href} className={`item${ativo(href) ? " on" : ""}`}>
                <Icone strokeWidth={2} aria-hidden="true" />
                <span>{rotulo}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
