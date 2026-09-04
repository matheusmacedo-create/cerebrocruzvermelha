import type { Conta, Direito, Item } from "./tipos";
import { resolverConta } from "./contas";

/**
 * Direito de imagem.
 *
 * A regra dura do projeto: a mídia de terceiro é contexto de triagem.
 * Ela aparece no Jornal para a pessoa decidir. Ela NÃO viaja para a peça
 * da filial. Só `autorizado` pode ser publicado.
 *
 * A foto da própria filial é o caso do meio: é dela, mas ainda falta o ato
 * humano — o termo de quem aparece na foto. Ela recebe `casa`, e não
 * `contexto`: chamar a foto da Casa de "terceiro" fazia a Redação receber
 * duas mensagens opostas sobre a mesma imagem.
 */

export const DIREITO_ROTULO: Record<Direito, string> = {
  autorizado: "autorizado",
  casa: "da Casa",
  movimento: "movimento",
  oficial: "oficial",
  terceiro: "terceiro",
  contexto: "contexto",
  stock: "stock",
};

export const DIREITO_EXPLICACAO: Record<Direito, string> = {
  autorizado: "Material da Casa com autorização de imagem assinada. Pode publicar.",
  casa: "Material da própria filial. Entra na peça depois que alguém confirmar o termo de imagem de quem aparece.",
  movimento: "Material do movimento. Conferir a data antes — repost antigo não entra.",
  oficial: "Material de órgão público. Crédito obrigatório e nunca reassinado como se fosse da Cruz.",
  terceiro: "Material de terceiro. Serve de contexto na triagem, não entra em peça da filial.",
  contexto: "Referência de cena. Não é registro do fato. Não viaja.",
  stock: "Banco de imagem. Proibido em peça que fale de operação real.",
};

/** Pode entrar numa peça publicada pela filial, sem mais nenhum ato humano? */
export function podePublicar(d: Direito): boolean {
  return d === "autorizado";
}

/** É material da própria filial — publicável assim que o termo for confirmado? */
export function daCasa(d: Direito): boolean {
  return d === "autorizado" || d === "casa";
}

/** Deduz o direito a partir da conta de origem. */
export function direitoDe(item: Item): Direito {
  const c: Conta | undefined = resolverConta(item);
  if (item.midia?.direito) return item.midia.direito;
  if (!c) return "terceiro";
  switch (c.vinculo) {
    case "casa":
      // Ser da Casa não basta: autorização de imagem é um ato humano,
      // registrado na Redação. O Cérebro nunca presume que existe.
      return "casa";
    case "movimento":
      return "movimento";
    case "oficial":
      return "oficial";
    default:
      return "terceiro";
  }
}

/** Frase de crédito exibida sobre a mídia no Jornal. */
export function credito(item: Item): string {
  const c = resolverConta(item);
  const d = direitoDe(item);
  const quem = c ? c.instagram ?? c.x ?? c.nome : item.fonte;
  if (d === "autorizado") return `${quem} · autorizado`;
  if (d === "casa") return `${quem} · da Casa, confirmar termo de imagem`;
  if (d === "oficial") return `${quem} · material oficial, crédito obrigatório`;
  if (d === "movimento") return `${quem} · movimento, conferir data`;
  return `${quem} · terceiro, só contexto de triagem`;
}
