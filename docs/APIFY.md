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

## Fase 2 — o que ainda não está aqui

- **X (Twitter).** A lista já guarda os handles das 18 contas com X. Falta o actor
  e um `normalizar` equivalente. O X é mais rápido que o Instagram em emergência,
  então é a próxima peça natural.
- **Sites que bloqueiam.** Diário Oficial da União (403), IOERJ e Prefeitura do
  Rio ainda estão fora — são candidatos a um actor de scraping próprio.
