## Objetivo
Transformar **Insumos Comprados** no cadastro **canônico** dos ingredientes (1 linha por insumo) e mover toda compra individual para **Histórico de Compras**. Sem quebrar Supabase, RLS, fichas técnicas, cálculos de CMV, edge functions ou n8n.

## Conceito (estado final)

```text
insumos_comprados        → cadastro canônico (1 linha por ingrediente)
                          preço atual = última compra (default)
                          último fornecedor + data
insumos_compras_historico → toda compra individual (memória)
fichas_tecnicas_*_ingredientes → continuam apontando p/ insumos_comprados.id
```

Hoje `insumos_comprados` já tem campos canônicos (`preco_medio`, `preco_minimo`, `preco_maximo`, `total_compras`, `nome_canonico`, `insumo_catalog_id`). A lógica para alimentar isso vem da edge `ingest-nota-fiscal`. Para entradas manuais e BRISA, o histórico não estava sendo populado — vamos consertar.

## O que NÃO muda
- Schemas existentes, RLS, foreign keys, edge functions de classificação/cascata.
- IDs de `insumos_comprados` referenciados pelas fichas técnicas.
- Cálculos de CMV / precificação.
- `insumos_proprios` (aba "Produzidos") fica intacta.

## O que muda

### 1. Banco (migração leve)
- Trigger em `insumos_compras_historico` que **upserta** o `insumos_comprados` correspondente: atualiza `preco_pago` (preço atual), `fornecedor`, `data_compra`, recalcula `preco_medio/min/max/total_compras`. Já existe parcialmente — vamos garantir consistência.
- Trigger em `insumos_comprados` (INSERT/UPDATE manual) que **espelha** uma linha em `insumos_compras_historico` quando vier com `data_compra`/`fornecedor` (para entradas manuais virarem histórico automaticamente).
- View `vw_insumos_canonicos` que agrega: insumo + última compra + variação vs anterior + contagem de fichas que usam.

### 2. UI — `src/pages/Insumos*.tsx`

Substituir a aba única atual por 3 sub-tabs dentro de "Comprados" (mantém a tab "Produzidos" do `InsumosCategoryTabs` no topo):

```text
/insumos/comprados           → Tab "Insumos Comprados"   (canônico)
/insumos/comprados/historico → Tab "Histórico de Compras"
/insumos/comprados/duplicados→ Tab "Revisar Duplicados"
/insumos/produzidos          → (existente, intocado)
```

#### Tab 1 — Insumos Comprados (canônico)
Refatora `InsumosComprados.tsx`. Colunas:
Nome · Categoria · Unidade · **Preço atual** · **Último fornecedor** · **Última compra** · **Variação** (vs penúltima compra, com seta ↑↓ colorida) · **Usado em N fichas** · Status (Normal/Atenção/Alta forte baseado em `usePriceAlerts`).
Ações: Editar · Ver histórico (abre tab 2 filtrada) · Ver fichas que usam (dialog) · Revisar duplicados.

#### Tab 2 — Histórico de Compras
Nova página. Lê `insumos_compras_historico` JOIN `insumos_comprados`. Colunas:
Data · Insumo (nome canônico) · **Nome original na nota** · Fornecedor · Qtd · Unidade · Preço unit. · Preço total · NF (link p/ `notas_fiscais` se houver) · Origem (manual/whatsapp/importação).
Filtros: insumo, fornecedor, período. Sem ações destrutivas (histórico imutável).

#### Tab 3 — Revisar Duplicados
Nova página. Agrupa `insumos_comprados` por similaridade de nome (já temos lógica `dupCount` por nome lowercased; estendemos com matching simples: remove prefixos `FLV `, `V `, sufixos ` KG`, `SALADA`, e usa Levenshtein leve client-side). Para cada grupo:
- Card mostra os candidatos lado a lado (preço, fornecedor, fichas que usam).
- Ação **Mesclar**: usuário escolhe insumo principal → remap em `fichas_tecnicas_*_ingredientes`, `bordas_ingredientes`, `bases_ficha_ingredientes`, `insumos_proprios_ingredientes`, `insumos_compras_historico` → delete dos secundários. Tudo numa edge function `mesclar-insumos` (transacional).
- Ação **Ignorar** (cria registro `duplicados_ignorados` p/ não reaparecer).

### 3. Componentes novos
- `src/components/insumos/InsumosSubTabs.tsx` (Comprados | Histórico | Duplicados).
- `src/pages/InsumosHistoricoCompras.tsx`.
- `src/pages/InsumosDuplicados.tsx`.
- `src/components/insumos/MesclarDuplicadosDialog.tsx`.
- `src/components/insumos/FichasQueUsamDialog.tsx`.
- Edge function `supabase/functions/mesclar-insumos/index.ts`.

### 4. Roteamento
Adiciona rotas em `App.tsx` e atualiza `InsumosCategoryTabs` para preservar a hierarquia (Comprados/Produzidos no topo; sub-tabs só dentro de Comprados).

## Garantias de não-quebra
- Fichas continuam usando `insumos_comprados.id` — nada muda nesse contrato.
- Edge `ingest-nota-fiscal` já produz histórico → nada muda lá.
- Cálculos `useProductCosts`, `usePriceAlerts`, cascata de CMV continuam lendo `insumos_comprados.preco_pago` — só passa a ser **mais fresco**.
- `insumos_proprios` intocado.
- Mesclagem feita por edge function com `service_role` em transação, preservando todos os FKs lógicos.

## Entregáveis (ordem de execução)
1. Migração: triggers + view + tabela `duplicados_ignorados`.
2. Edge function `mesclar-insumos`.
3. UI: SubTabs + 3 páginas + dialogs.
4. Roteamento.
5. QA: abrir cada tab, conferir BRISA aparecendo no histórico, simular merge com dry-run logging.