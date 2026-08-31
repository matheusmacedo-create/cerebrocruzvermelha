# Arquivos de apoio da Apify

- **`instagram-inputs.json`** — os quatro inputs do `apify/instagram-post-scraper`,
  um por cadência. Serve para colar numa Task do painel ou conferir a lista.
- **`lista-fechada.txt`** — a lista completa em texto, para revisão humana.

Ambos são **gerados** a partir de `src/core/contas.ts`. Não edite aqui: mude a
lista no código, onde a alteração passa por revisão, e regenere:

```bash
npx tsx -e 'import{todosOsInputsInstagram,resumoDaLista}from"./src/apify/input";import{writeFileSync}from"node:fs";writeFileSync("apify/instagram-inputs.json",JSON.stringify(todosOsInputsInstagram(),null,2)+"\n");writeFileSync("apify/lista-fechada.txt",resumoDaLista()+"\n")'
```

O campo `onlyPostsNewerThan` é relativo ao momento da geração. Em produção o input
é montado a cada run por `inputInstagram()`, então a data está sempre certa — os
arquivos aqui são retrato, não fonte.
