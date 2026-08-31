# Arquitetura — como um sinal vira decisão

```
  Instagram (Apify)          RSS / APIs / diários oficiais
        │                              │
        ▼                              ▼
  normalizar.ts  ──── lista fechada ────┤   fora da lista: descartado aqui
        │                              │
        └──────────► Item ◄────────────┘
                      │
                      ▼
              ehSinal()  ── página sem data e sem corpo → acervo, nunca atenção
                      │
                      ▼
              decidir()  ── 6 perguntas + travas duras → Score
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    direitoDe()  planoDeCanais()  proibicoes()
        │             │             │
        └─────────────┼─────────────┘
                      ▼
              Telas  +  /api/pauta  ──►  Redação (decisão humana)
```

## As camadas

**`src/core/`** não sabe que a Apify existe, nem que existe um site. É o
vocabulário, a lista fechada e as regras. Se um dia a coleta mudar de fornecedor,
esta pasta não muda.

**`src/apify/`** é a fronteira com o mundo. `normalizar.ts` é onde a lista fechada
vira barreira: um post de conta desconhecida não vira `Item`, então não existe
para o resto do sistema.

**`src/dados/`** decide de onde a UI lê e monta o snapshot. `carregarAcervo()`
tenta a Apify e cai para a semente do repositório quando não há token, não há
rede, ou a leitura falhou. O rodapé de toda tela diz qual das duas está no ar —
uma falha silenciosa que faz a equipe trabalhar sobre dado velho seria pior que
uma tela quebrada.

**`src/app/`** são as telas e as rotas. Nenhuma regra de decisão mora aqui.

## Por que regras e não um modelo

O método é `regras + cruzamento lexical eixo↔fonte`. Sem modelo generativo.

Três razões:

1. **Auditável.** Toda nota carrega as frases que a produziram. Quem discorda
   consegue apontar qual pergunta errou e corrigir uma linha do léxico.
2. **Estável.** A mesma entrada dá a mesma saída. Um calendário editorial não
   pode oscilar porque a temperatura de um modelo mudou.
3. **Barato.** 263 sinais são pontuados a cada requisição sem chamada externa.

O custo é conhecido: o léxico erra em ironia, sarcasmo e contexto implícito. Ele
não decide sozinho — ele reduz de centenas para poucas, e a pessoa decide.

## Onde ficam as decisões difíceis

**Autorização de imagem não é presumida.** Em `direitoDe()`, conteúdo da própria
filial recebe `contexto`, não `autorizado`. Isso parece contraintuitivo, mas
autorização é um ato humano com termo assinado, registrado na Redação. Um sistema
que presume autorização porque a foto é "nossa" acaba publicando o rosto de um
voluntário que nunca assinou nada.

**Fonte oficial não vira ação própria.** `medirAcaoReal()` distingue "o assunto
apareceu" de "a filial fez algo". Reproduzir "100 ocorrências" dos Bombeiros no
feed da Cruz é assinar operação alheia — e o motor pontua isso baixo por padrão,
não por exceção.

**A ponte entre RSS e Instagram.** `resolverConta()` reconhece que a Defesa Civil
que chega por RSS é a mesma que chega pelo Instagram. Sem ela, o motor trataria
todo sinal documental como fonte desconhecida e a coleta histórica valeria menos
que um post.

## Cache e atualização

As telas revalidam a cada 15 minutos. O webhook da Apify chama `revalidatePath`
ao terminar uma coleta, então dado novo aparece assim que chega — a revalidação
por tempo é só a rede de segurança.
