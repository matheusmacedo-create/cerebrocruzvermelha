# Apify — coleta e atualização

A Apify é a coleta **e** o armazenamento. Não há banco intermediário: o Dataset
guarda os posts de cada run, o Key-Value Store guarda o snapshot montado do
acervo, e o app só lê. Menos peça para dessincronizar.

## Configuração

```bash
cp .env.example .env.local
```

| Variável | Para quê |
|---|---|
| `APIFY_TOKEN` | Token da conta. Sem ele o app abre no acervo semente. |
| `APIFY_KV_STORE` | Id ou nome do Key-Value Store do snapshot (chave `acervo-atual`). |
| `APIFY_ACTOR_INSTAGRAM` | Padrão `apify/instagram-post-scraper`. |
| `APIFY_WEBHOOK_SECRET` | Conferido em `/api/webhook/apify?segredo=…`. |
| `CRON_SECRET` | Protege `/api/coleta`. O Cron da Vercel envia como `Bearer`. |

## Cadências

A lista fechada declara a cadência de cada conta, e é dela que sai o input do
actor — a lista de perfis nunca é digitada à mão num painel.

| Cadência | Janela | Cron | Contas |
|---|---|---|---|
| `tempo_real` | 6h | a cada 6 horas | COR-Rio, Alerta Rio, Defesa Civil do Rio, Voz das Comunidades, Fogo Cruzado, OTT |
| `diario` | 30h | 09:20 | SEDEC-RJ, CBMERJ, INEA, Hemorio, Maré, Fala Roça, Lume, mobilidade, filial RJ |
| `3_dias` | 78h | 09:40, a cada 3 dias | SMS-Rio, SES-RJ, Fiocruz, LabJaca, CVB nacional |
| `10_dias` | 246h | dias 1, 11 e 21 | IFRC |

Três coisas seguram o custo: o teto de posts por perfil (12 em tempo real, 8 nas
demais), o `onlyPostsNewerThan` — que filtra data do lado da Apify, antes de você
pagar pelo item — e o `skipPinnedPosts`, já que post fixado é institucional
antigo, não sinal.

## Conferir antes de gastar

```bash
npm run coleta:dry                       # imprime a lista e o input, não chama a Apify
npm run coleta -- --cadencia diario      # dispara, espera a run e grava o snapshot
```

## Webhook

Na Apify, no actor ou na task, crie um webhook:

- Evento: `ACTOR.RUN.SUCCEEDED`
- URL: `https://<seu-app>/api/webhook/apify?segredo=<APIFY_WEBHOOK_SECRET>`

Ao receber, o app lê o dataset da run, normaliza contra a lista fechada, mescla no
snapshot por id — o mesmo post coletado duas vezes não vira dois sinais — grava no
Key-Value Store e revalida as telas.

A resposta diz quantos foram lidos, aceitos e descartados. `descartados` alto é
sinal de que um handle da lista mudou.

## Cron na Vercel

`vercel.json` já traz as quatro entradas. A Vercel envia `Authorization: Bearer
$CRON_SECRET`, conferido em `/api/coleta`. Sem `CRON_SECRET` definido a rota só
responde fora de produção.

## Diagnóstico

`GET /api/saude` diz de onde o Cérebro está lendo agora, se há token e store, e
quais fontes documentais estão fora do ar.

## O MCP da Apify

Para operar a Apify conversando com um assistente, o servidor MCP dá acesso a
actors, runs, storage e tasks:

```
https://mcp.apify.com/?tools=actors,docs,runs,storage,tasks,apify/instagram-post-scraper
```

Ele é ótimo para explorar e depurar. A coleta de produção continua sendo o cron —
uma rotina que a instituição depende não deveria precisar de alguém conversando
com um assistente para rodar.

## Estado dos handles do Instagram

Conferido contra a Apify em 31/08/2026 com `npm run handles`. Dos 23 handles da
lista original, **7 não existiam** e um redirecionava para outra organização —
o pior caso, porque atribuiria conteúdo alheio à fonte errada.

| Conta | Handle na lista | Achado |
|---|---|---|
| Defesa Civil Municipal | `@defesacivilrio` | não existe → **`@defesacivil_rio`** |
| MetrôRio | `@metroriooficial` | não existe → **`@metro_rio`** |
| Maré de Notícias | `@maredenoticias` | redireciona para `@vozdascomunidades` → **`@redesdamare`**, a organização que publica o jornal |
| INEA | `@ineagovrj` | não existe, sem substituto confirmado |
| Fogo Cruzado | `@fogocruzadorj` | não existe, sem substituto confirmado |
| OTT | `@ott_rio` | não existe, sem substituto confirmado |
| SuperVia | `@supervia_trens` | não existe, sem substituto confirmado |
| CCR Barcas | `@ccrbarcas` | não existe; `@ccr_barcas` existe mas não parece institucional |

As cinco sem substituto ficam com `instagramStatus: "ausente"` e **não entram na
coleta** — pedir handle inexistente gasta run e faz a fonte sumir sem avisar.
Elas seguem na lista pelo X, que é a fase 2.

`@defesacivilrj`, `@fiocruz` e `@falaroca` existem mas o Instagram bloqueia o
scraper de forma intermitente (`no_items` com *"Request got blocked"*). Continuam
sendo pedidas; o bloqueio passa.

Reconfira quando a coleta trouxer menos do que devia:

```bash
npm run handles                       # a lista inteira
npm run handles -- metro_rio inea_rj  # só estes
```

Uma run por handle, porque em lote o actor omite o `inputUrl` nos registros de
`not_found` e não dá para saber qual falhou. Handle inexistente não gera post
cobrável, então conferir custa quase nada.

## Custo medido

Medido em runs reais de 31/08/2026: **US$ 0,0023 por post** (US$ 2,30/mil).
A coleta de `tempo_real` com 4 perfis trouxe 16 posts por US$ 0,04. Perfil que
falha não é cobrado.

## Fase 2 — o que ainda não está aqui

- **X (Twitter).** A lista já guarda os handles das 18 contas com X, entre elas
  as cinco que hoje estão fora da coleta por não ter Instagram confirmado. Falta o actor
  e um `normalizar` equivalente. O X é mais rápido que o Instagram em emergência,
  então é a próxima peça natural.
- **Sites que bloqueiam.** Diário Oficial da União (403), IOERJ e Prefeitura do
  Rio ainda estão fora — são candidatos a um actor de scraping próprio.
