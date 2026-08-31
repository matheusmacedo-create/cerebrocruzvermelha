/**
 * O título de um post é a primeira frase da legenda, então o resumo começa
 * repetindo-o. Mostrar os dois faz o cartão parecer gaguejar.
 */
export function semORepetido(titulo: string, resumo: string): string {
  const inicio = titulo.replace(/…$/, "").trim();
  if (inicio.length > 12 && resumo.startsWith(inicio)) {
    return resumo.slice(inicio.length).replace(/^[\s.,;:—-]+/, "");
  }
  return resumo;
}
