# Integração com a Redação

O Cérebro termina em `/api/pauta`. Essa rota é a fronteira: dali para frente quem
decide, produz e publica é a Redação.

## O contrato

```
GET /api/pauta                      as pautas que passaram do corte
GET /api/pauta?id=<id>              uma pauta específica
GET /api/pauta?modo=produzir        por modo de decisão
GET /api/pauta?limite=50            teto de 100
```

```jsonc
{
  "versao": "1.0",
  "origem": "apify",           // ou "seed" — a Redação sabe se o dado é vivo
  "geradoEm": "2026-08-30T23:36:12Z",
  "aviso": "O Cérebro recomenda; ele não publica. …",
  "total": 5,
  "pautas": [
    {
      "id": "64f3a318…",
      "titulo": "…",
      "resumo": "…",
      "fato": {
        "fonte": "Defesa Civil do Estado (RJ)",
        "conta": "@defesacivilrj",
        "url": "https://…",
        "quando": "2026-08-30T14:00:00Z",
        "plataforma": "instagram",
        "confiavel": true          // confiança ≥ 80
      },
      "decisao": {
        "modo": "agendar",
        "modoRotulo": "Agendar",
        "veredito": "quase",
        "nota": 68,
        "notas": { "localidade": 85, "urgencia": 31, "relacao": 96,
                   "acaoReal": 12, "ineditismo": 85, "confianca": 95 },
        "porque": ["…"]            // o raciocínio, não só a conclusão
      },
      "midia": {
        "url": "https://…",
        "formato": "reels",
        "direito": "oficial",
        "podePublicar": false,     // ← a trava, explícita no contrato
        "credito": "@defesacivilrj · Defesa Civil do Estado do RJ"
      },
      "canais": [ { "canal": "stories", "usar": true, "formato": "…",
                    "midia": "…", "cta": "…", "texto": "…" } ],
      "proibido": ["…"]
    }
  ]
}
```

## O que a Redação precisa respeitar

**`midia.podePublicar === false` significa que aquela mídia não pode entrar na
peça.** Ela veio para a triagem — para a pessoa ver do que se trata — e para aí. A
Redação usa arte própria ou foto autorizada da filial. Se houver um único
if a implementar a partir deste contrato, é este.

**`canais[].usar === false` não é uma sugestão fraca.** É o Cérebro dizendo que
naquele canal a peça não se sustenta, e o campo `texto` explica o motivo e, quando
existe, a alternativa.

**`proibido` é lista de bloqueio,** não de avisos. Ela combina a regra geral de
direito de imagem com o cuidado específico daquela conta.

**`decisao.porque` deve chegar ao humano.** Uma recomendação sem raciocínio vira
ordem, e ninguém deveria receber ordem de um sistema de triagem. Mostre as frases
na tela de aprovação.

## Versionamento

`versao` sai de `src/core/contrato.ts`.

- Campo novo e opcional → sobe a menor (`1.1`).
- Campo removido, renomeado ou com semântica alterada → sobe a maior (`2.0`).

A Redação deve conferir a maior e recusar o que não conhece. Um contrato que muda
em silêncio é pior que um contrato que quebra alto.

## Duas formas de integrar

**HTTP (recomendada agora).** A Redação chama `/api/pauta` quando abre a tela de
pauta. Simples, e os dois lados sobem independentes.

**Importar o core.** Se a Redação virar o mesmo monorepo, `src/core/` não depende
de Next nem de Apify: dá para importar `decidir`, `planoDeCanais` e `proibicoes`
direto. Vale quando a Redação precisar repontuar com contexto que só ela tem.

## O que a Redação devolve — fase 2 (fechada)

O laço de volta existe e tem duas pontas:

**A recusa com motivo.** A Redação recusa uma sugestão pela tela Cérebro dela e
o motivo chega em `POST /api/feedback` daqui. O sinal sai de todas as leituras
seguintes, e "repetitivo"/"já falamos" fazem o motor recuar naquela fonte.

**O contexto da operação.** A Redação expõe `GET /api/cerebro/contexto` com dois
conjuntos, ambos só de títulos, janela de 60 dias:

- **`jaPublicado`** — os títulos do que foi ao ar (destinos `publicada` do hub,
  pela data real de publicação). Alimenta `medirIneditismo`: sem isso o Cérebro
  só pegava marca textual de conteúdo requentado e repetia o que a Casa acabou
  de postar.
- **`acoesDaCasa`** — as atividades Ação e Evento do Registrar. Alimenta
  `medirAcaoReal`: é o que separa "o assunto apareceu" de "a filial fez algo".

O Cérebro lê isso em `src/dados/redacao.ts` e injeta no `ContextoDecisao` de
todas as telas e do próprio `/api/pauta`, com cache de 5 minutos. Configuração:
`REDACAO_URL` (sem ela, nada muda — o Cérebro decide como sempre decidiu) e
`REDACAO_CONTEXTO_TOKEN`, o mesmo segredo do `CEREBRO_CONTEXTO_TOKEN` de lá,
necessário só se a Redação fechar a rota. Falha de rede, rota ausente ou
resposta estranha degradam para o comportamento antigo, nunca para erro.
