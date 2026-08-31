import type { Canal, Item, Score } from "./tipos";
import { SOMENTE_INTERNO, resolverConta } from "./contas";
import { direitoDe, podePublicar } from "./direito";

/**
 * Do sinal para o plano por canal.
 *
 * O Cérebro não escreve a peça. Ele diz, para cada canal, se usa ou não,
 * qual mídia é a certa e qual é o encaminhamento — e por quê.
 * A Redação recebe isso como ponto de partida, não como texto pronto.
 */

export interface PlanoCanal {
  canal: Canal;
  usar: boolean;
  formato: string;
  midia: string;
  cta: string;
  texto: string;
}

export const CANAL_ROTULO: Record<Canal, string> = {
  site: "Site",
  feed: "Feed",
  stories: "Stories",
  reels: "Reels",
};

export function planoDeCanais(item: Item, score: Score): PlanoCanal[] {
  const c = resolverConta(item);
  const d = direitoDe(item);
  const midiaPropria = podePublicar(d);
  const interno = c ? SOMENTE_INTERNO.has(c.id) : false;

  if (interno) {
    const recusa = `${c!.nome} é fonte de uso interno. Alimenta a decisão de deslocamento da equipe, não o conteúdo público.`;
    return (["site", "feed", "stories", "reels"] as Canal[]).map((canal) => ({
      canal,
      usar: false,
      formato: "Não publica",
      midia: "—",
      cta: "—",
      texto: recusa,
    }));
  }

  if (score.modo === "arquivar" || score.modo === "monitorar") {
    return (["site", "feed", "stories", "reels"] as Canal[]).map((canal) => ({
      canal,
      usar: false,
      formato: "Não agora",
      midia: "—",
      cta: "—",
      texto: `Fica no acervo. ${score.porque[0] ?? ""} Reabre se o registrar trouxer ação da filial.`,
    }));
  }

  const creditoObrigatorio = d === "oficial" ? ` Crédito a ${c?.instagram ?? item.fonte} em tela.` : "";
  const avisoMidia = midiaPropria
    ? "Material da Casa com autorização."
    : `Mídia do card é ${d} — não viaja para a peça. Usar arte própria ou foto autorizada da filial.`;

  const urgente = score.modo === "agir_agora";

  return [
    {
      canal: "site",
      usar: score.acaoReal >= 45 && score.total >= 60,
      formato: score.acaoReal >= 45 ? "Matéria curta, 400–600 palavras" : "Não abre matéria",
      midia: avisoMidia,
      cta: "Encaminhamento oficial da filial",
      texto:
        score.acaoReal >= 45
          ? `Abre com o fato e a fonte. Sem cifra inventada.${creditoObrigatorio} Fecha com o que a filial faz de verdade.`
          : "Sem ação própria confirmada, matéria no site vira eco de terceiro. Guardar para quando o registrar confirmar.",
    },
    {
      canal: "feed",
      usar: midiaPropria && score.total >= 65 && score.acaoReal >= 60,
      formato: midiaPropria ? "Carrossel do eixo" : "Não no feed agora",
      midia: avisoMidia,
      cta: "Último card só com oferta real",
      texto: midiaPropria
        ? "Carrossel com chão da Casa. Último card vira CTA apenas se o registrar confirmar turma, vaga ou ponto de coleta."
        : "Feed da filial pede imagem da filial. Sem foto autorizada, o feed cala.",
    },
    {
      canal: "stories",
      usar: score.total >= 50,
      formato: urgente ? "Sequência de plantão" : "3 telas de tradução",
      midia: "Arte tipográfica própria ou fundo da Casa.",
      cta: urgente ? "199 Defesa Civil · 193 Bombeiros" : `Perfil da fonte${c?.instagram ? ` (${c.instagram})` : ""}`,
      texto: urgente
        ? `1 O que está acontecendo, com a fonte nomeada.\n2 O que a pessoa faz agora.\n3 Para quem ligar.${creditoObrigatorio}`
        : `1 O fato, creditado.\n2 O que a filial faz nesse assunto.\n3 Encaminhamento.${creditoObrigatorio}`,
    },
    {
      canal: "reels",
      usar: midiaPropria && score.total >= 70,
      formato: midiaPropria ? "15–20s vertical" : "Não republicar o vídeo de terceiro",
      midia: avisoMidia,
      cta: "Link na bio",
      texto: midiaPropria
        ? "Gente da Casa, tarefa real, sem manobra arriscada. Legenda sem número inventado."
        : "Recortar o vídeo de terceiro no perfil da Cruz é assinar operação alheia. Só com produção própria.",
    },
  ];
}

/** Lista curta do que não pode, derivada da conta e do direito. */
export function proibicoes(item: Item): string[] {
  const c = resolverConta(item);
  const d = direitoDe(item);
  const fora: string[] = [];
  if (!podePublicar(d)) fora.push(`Usar esta mídia (${d}) em peça da filial`);
  if (c?.vinculo === "oficial") fora.push("Reproduzir número ou balanço da fonte como se fosse da Cruz");
  if (c?.vinculo === "movimento") fora.push("Republicar peça sem data explícita");
  if (c && SOMENTE_INTERNO.has(c.id)) fora.push("Qualquer publicação pública a partir desta fonte");
  if (c?.cuidado) fora.push(c.cuidado);
  fora.push("Stock photo em post que fala de operação real");
  return fora;
}
