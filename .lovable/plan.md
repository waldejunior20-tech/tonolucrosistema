
# Cada item da nota com sua própria categoria

## Problema atual

Hoje o sistema faz **uma linha só** por nota fiscal:

> "Cupom Fiscal - GAUCHO FRIOS — R$ 1.703,60 — subcategoria: Proteínas"

E o gatilho de fornecedor "decora" que tudo da Gaúcho Frios é Proteínas. Resultado: copo, mussarela, palmito, orégano — tudo cai em Proteínas no gráfico "Para onde foi o dinheiro".

## Como vai ficar

Cada item da NF vira uma linha no DRE com **sua própria subcategoria**, derivada da categoria do insumo:

| Item da NF | Categoria insumo | Vai pro DRE como |
|---|---|---|
| Mussarela | Laticínios | Insumos / **Laticínios** |
| Copo 500 | Embalagens | Insumos / **Embalagens** |
| Palmito | Molhos | Insumos / **Molhos e Condimentos** |
| File de frango | Proteínas | Insumos / **Açougue/Proteínas** |

Aí no gráfico você vê: "32% Açougue, 18% Laticínios, 9% Embalagens..." em vez de "tudo Gaúcho Frios = Proteínas".

## O que muda tecnicamente

### 1. Edge function `ingest-nota-fiscal`
Em vez de inserir **1 lançamento agregado** com `categoria='Insumos'`, insere **N lançamentos** (um por item) já com a subcategoria certa baseada na categoria do insumo.

### 2. Trigger `aplicar_fornecedor_subcategoria`
Para de aplicar/aprender o mapeamento de fornecedor quando `categoria='Insumos'`. O fornecedor ainda funciona pra despesas operacionais (Axion = Marketing, posto = Combustível), mas não atropela mais a categoria por item dos insumos.

### 3. Backfill (migration)
Apaga as linhas agregadas existentes ("Cupom Fiscal - X") e recria como linhas por item, usando `insumos_comprados` como fonte da verdade. Mantém o total exatamente igual.

### Mapeamento categoria insumo → subcategoria DRE

```text
Proteínas              → Açougue/Proteínas
Laticínios             → Laticínios
Hortifruti             → Hortifruti
Secos                  → Mercearia
Bebidas                → Bebidas
Molhos e Condimentos   → Molhos e Condimentos
Embalagens             → Embalagens
Congelados             → Congelados
Confeitaria            → Confeitaria
```

## Arquivos afetados
- `supabase/migrations/...` — função de mapeamento, trigger ajustado, backfill
- `supabase/functions/ingest-nota-fiscal/index.ts` — 1 lançamento por item

Posso seguir?
