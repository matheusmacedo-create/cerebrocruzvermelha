# Cérebro de Notícias — Cruz Vermelha Brasileira, Filial RJ

> Das centenas de coisas observadas, **estas poucas merecem sua atenção** — e estas
> duas devem entrar no calendário.

O Cérebro observa, entende e decide. **Ele não publica.** Quem produz, aprova e
publica é a Redação, com decisão humana. Esta separação é o projeto inteiro: um
sistema que recomenda é útil; um sistema que posta sozinho em nome de uma
instituição humanitária é um risco.

Construído separado, para depois integrar à Redação pelo contrato em
[`/api/pauta`](#contrato-com-a-redação).

## O que ele faz

1. **Observa** uma lista fechada de 23 contas (Instagram e X) e as fontes
   documentais — RSS, APIs e diários oficiais.
2. **Entende** cada sinal por seis perguntas, com nota de 0 a 100 e o porquê escrito.
3. **Decide** entre agir agora, produzir, agendar, avaliar, monitorar ou arquivar.
4. **Entrega** à Redação uma pauta com fato, fonte, plano por canal e o que não pode.

## Rodando

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # build de produção
npx tsx scripts/verificar.ts   # 23 checagens do motor sobre dados reais
```

Sem `APIFY_TOKEN` o Cérebro abre no **acervo semente** do repositório — a coleta
real de 30/08/2026, com 263 sinais, 29 peças e 52 datas. Ele nunca abre vazio.

## Telas

| Tela | O que responde |
|---|---|
| **Hoje** | O que precisa de decisão hoje, e por quê. |
| **Jornal** | Triagem sinal a sinal: veredito, direito de imagem e plano por canal. |
| **Acervo** | Tudo que foi observado, inclusive o recusado. Recusa também é memória. |
| **Calendário** | Oportunidades e peças sugeridas — nenhum dos dois é compromisso. |
| **Fontes** | A lista fechada, com o motivo de cada conta estar nela. |

## As seis perguntas

| Pergunta | Peso | O que reprova |
|---|---|---|
| É local? | 24% | Fora do RJ e sem urgência: a filial do Rio não precisa responder. |
| É urgente? | 20% | Sem urgência não é ruptura — é produção tranquila. |
| Tem relação conosco? | 24% | Não encosta em nenhum eixo: boa informação, pauta de outra pessoa. |
| Existe ação real? | 14% | Sem operação própria, balanço de terceiro não vira post. |
| Já falamos disso? | 8% | Gancho repetido gasta audiência. |
| Fonte confiável? | 10% | Monitor não verificado não sustenta peça pública. |

Antes de tudo isso há uma trava estrutural: **página não é sinal**. Item sem data
e sem corpo é catálogo de site raspado junto com a notícia — vai para o acervo e
nunca disputa atenção. Sem ela o Cérebro promove "ônibus de vacinação de 2021" a
pauta de hoje, que é exatamente a armadilha que ele existe para evitar.

## As travas duras

Elas mandam mais que a soma das notas.

- **Só `autorizado` publica.** Mídia de terceiro, oficial, do movimento ou de
  contexto aparece no Jornal como referência de triagem e para aí. Não viaja para
  a peça. Ser da Casa também não basta: autorização de imagem é ato humano
  registrado na Redação, e o Cérebro nunca presume que existe.
- **Fonte de uso interno nunca vira conteúdo público.** Fogo Cruzado, OTT e as
  contas de mobilidade informam o deslocamento da equipe, não o feed.
- **Filtro de data obrigatório** nas contas do movimento. Repost antigo sem data
  explícita não entra.
- **A lista fechada é a fronteira.** Post de conta fora dela é descartado na
  normalização, antes de chegar ao motor.

## Estrutura

```
src/core/       tipos, lista fechada, léxico, motor de decisão,
                direito de imagem, plano por canal, contrato
src/apify/      cliente REST, inputs dos actors, normalização do Instagram
src/dados/      carregador do acervo e montador do snapshot
src/app/        telas e rotas de API
scripts/        coleta manual e verificação do motor
docs/           arquitetura, Apify e integração com a Redação
```

## Contrato com a Redação

`GET /api/pauta` devolve as pautas que passaram do corte, cada uma com o
raciocínio, o plano por canal e `midia.podePublicar` — a trava explícita no
contrato. Detalhes em [`docs/INTEGRACAO-REDACAO.md`](docs/INTEGRACAO-REDACAO.md).

## Documentação

- [Arquitetura](docs/ARQUITETURA.md) — como o sinal vira decisão
- [Apify](docs/APIFY.md) — coleta, cadências, custo e webhook
- [Integração com a Redação](docs/INTEGRACAO-REDACAO.md) — o contrato
