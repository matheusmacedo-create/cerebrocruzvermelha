import type { Canal, Item, Score } from "./tipos";
import { SOMENTE_INTERNO, resolverConta } from "./contas";
import { daCasa, direitoDe, podePublicar } from "./direito";

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
  // Foto da própria filial: entra na peça assim que alguém confirmar o termo
  // de imagem. Sem isto feed e reels nunca eram recomendados — nada no
  // Cérebro produz "autorizado", porque autorizar é ato humano da Redação.
  const midiaDaCasa = !midiaPropria && daCasa(d) && Boolean(item.midia);
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
    : midiaDaCasa
      ? "Foto da própria filial: entra como PENDENTE até confirmar o termo de imagem de quem aparece."
      : `Mídia do card é ${d} — não viaja para a peça. Usar arte própria ou foto autorizada da filial.`;
  const temFotoDaCasa = midiaPropria || midiaDaCasa;

  const urgente = score.modo === "agir_agora";
  const cta = ctaDoEixo(score, urgente);

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
      usar: temFotoDaCasa && score.total >= 65 && score.acaoReal >= 60,
      formato: temFotoDaCasa ? "Carrossel do eixo" : "Não no feed agora",
      midia: avisoMidia,
      cta: "Último card só com oferta real",
      texto: temFotoDaCasa
        ? `Carrossel com chão da Casa.${midiaDaCasa ? " Confirmar o termo de imagem antes de marcar como pronta." : ""} Último card vira CTA apenas se o registrar confirmar turma, vaga ou ponto de coleta.`
        : "Feed da filial pede imagem da filial. Sem foto autorizada, o feed cala.",
    },
    {
      canal: "stories",
      usar: score.total >= 50,
      formato: urgente ? "Sequência de plantão" : "3 telas de tradução",
      midia: "Arte tipográfica própria ou fundo da Casa.",
      cta: urgente ? cta : `Perfil da fonte${c?.instagram ? ` (${c.instagram})` : ""}`,
      texto: urgente
        ? `1 O que está acontecendo, com a fonte nomeada.\n2 O que a pessoa faz agora.\n3 ${cta}.${creditoObrigatorio}`
        : `1 O fato, creditado.\n2 O que a filial faz nesse assunto.\n3 Encaminhamento.${creditoObrigatorio}`,
    },
    {
      canal: "reels",
      usar: temFotoDaCasa && item.midia?.tipo === "video" && score.total >= 70,
      formato: temFotoDaCasa ? "15–20s vertical" : "Não republicar o vídeo de terceiro",
      midia: avisoMidia,
      cta: "Link na bio",
      texto: temFotoDaCasa
        ? "Gente da Casa, tarefa real, sem manobra arriscada. Legenda sem número inventado."
        : "Recortar o vídeo de terceiro no perfil da Cruz é assinar operação alheia. Só com produção própria.",
    },
  ];
}

/**
 * O encaminhamento de plantão muda com o eixo: 199/193 é para desastre; num
 * surto o telefone certo é o do SAMU e da vigilância. Antes era 199/193 para
 * dengue também.
 */
function ctaDoEixo(score: Score, urgente: boolean): string {
  if (!urgente) return "Encaminhamento da filial";
  switch (score.eixo) {
    case "saude":
      return "192 SAMU · 136 Disque Saúde";
    case "primeiros_socorros":
      return "192 SAMU · 193 Bombeiros";
    case "grd":
    default:
      return "199 Defesa Civil · 193 Bombeiros";
  }
}

/** Lista curta do que não pode, derivada da conta e do direito. */
export function proibicoes(item: Item): string[] {
  const c = resolverConta(item);
  const d = direitoDe(item);
  const fora: string[] = [];
  if (item.midia && !podePublicar(d)) {
    fora.push(
      daCasa(d)
        ? "Publicar rosto identificável desta foto sem o termo de imagem confirmado"
        : `Usar esta mídia (${d}) em peça da filial`,
    );
  }
  if (c?.vinculo === "oficial") fora.push("Reproduzir número ou balanço da fonte como se fosse da Cruz");
  if (c?.vinculo === "movimento") fora.push("Republicar peça sem data explícita");
  if (c && SOMENTE_INTERNO.has(c.id)) fora.push("Qualquer publicação pública a partir desta fonte");
  if (c?.cuidado) fora.push(c.cuidado);
  fora.push("Stock photo em post que fala de operação real");
  return fora;
}
