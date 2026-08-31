import type { Conta, Direito, Item } from "./tipos";
import { resolverConta } from "./contas";

/**
 * Direito de imagem.
 *
 * A regra dura do projeto: a mídia de terceiro é contexto de triagem.
 * Ela aparece no Jornal para a pessoa decidir. Ela NÃO viaja para a peça
 * da filial. Só `autorizado` pode ser publicado.
 */

export const DIREITO_ROTULO: Record<Direito, string> = {
  autorizado: "autorizado",
  movimento: "movimento",
  oficial: "oficial",
  terceiro: "terceiro",
  contexto: "contexto",
  stock: "stock",
};

export const DIREITO_EXPLICACAO: Record<Direito, string> = {
  autorizado: "Material da Casa com autorização de imagem assinada. Pode publicar.",
  movimento: "Material do movimento. Conferir a data antes — repost antigo não entra.",
  oficial: "Material de órgão público. Crédito obrigatório e nunca reassinado como se fosse da Cruz.",
  terceiro: "Material de terceiro. Serve de contexto na triagem, não entra em peça da filial.",
  contexto: "Referência de cena. Não é registro do fato. Não viaja.",
  stock: "Banco de imagem. Proibido em peça que fale de operação real.",
};

/** Pode entrar numa peça publicada pela filial? */
export function podePublicar(d: Direito): boolean {
  return d === "autorizado";
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
      return "contexto";
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
  if (d === "oficial") return `${quem} · material oficial, crédito obrigatório`;
  if (d === "movimento") return `${quem} · movimento, conferir data`;
  return `${quem} · terceiro, só contexto de triagem`;
}
