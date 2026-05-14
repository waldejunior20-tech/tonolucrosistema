## Estado atual (já implementado)

Boa parte da base solicitada já existe no projeto. Antes de criar coisa nova, vou consolidar o que falta e fechar lacunas — sem duplicar.

| Requisito | Status | Onde |
|---|---|---|
| 1. Histórico de compras (campos + view) | ✅ existe | `insumos_compras_historico` + `vw_historico_compras_completo` |
| 1. Filtros 7/30/90/mês/fornecedor/categoria | ✅ existe | `InsumosHistoricoCompras.tsx` |
| 2. Destinos (insumo/embalagem/financeiro/conta_pagar/revisar) | ✅ existe | coluna `destino` + enum textual |
| 3. Regras aprendidas | ✅ existe | tabela `regras_classificacao` |
| 4. Revisar Classificações | ✅ existe | `InsumosRevisar.tsx` + `vw_revisar_classificacoes` |
| 5. Revisar Duplicados | ✅ existe | `InsumosDuplicados.tsx` + `mesclar-insumos` |
| 6. Idempotência por hash | ✅ parcial | `tr_historico_idempotencia` (chave composta sem hash de documento) |
| 7. Trava de preço absurdo (3x média) | ✅ existe | `tr_historico_atualiza_insumo` bloqueia + flag `revisar` |
| 8. Auditoria | ✅ parcial | `auditoria_importacao` + `auditoria_correcoes_precos` existem |

## Lacunas reais a fechar

### A. Idempotência por documento (item 6)
A trava atual é por linha de item. Falta uma trava por **documento inteiro** (NF/cupom) para impedir reprocessamento da mesma nota. Adicionar coluna `documento_hash` em `notas_fiscais` (hash de chave-NF + total + fornecedor + data) com índice único parcial por unidade. `ingest-nota-fiscal` calcula o hash antes de inserir e retorna idempotente se já existir.

### B. Fila "Revisar Preço" dedicada (item 7)
Hoje preços bloqueados ficam misturados em `destino = revisar`. Adicionar:
- Coluna `motivo_revisao` em `insumos_compras_historico` (`classificacao` | `preco_suspeito` | `duplicado_suspeito`).
- Atualizar `tr_historico_atualiza_insumo` para preencher `motivo_revisao = 'preco_suspeito'` quando bloquear.
- Aba/filtro na página `InsumosRevisar` separando "Classificação" vs "Preço suspeito".

### C. Auditoria de fichas impactadas + CMV recalculado (item 8)
`auditoria_importacao` hoje guarda contadores básicos. Estender com:
- `fichas_impactadas` (jsonb): array `{ficha_id, tipo, cmv_antes, cmv_depois}`.
- `precos_bloqueados` (jsonb): array `{insumo_id, preco_tentado, preco_atual, fator}`.
- Edge function `ingest-nota-fiscal` calcula e grava esses dois ao final.

### D. KPI "preços bloqueados" no Histórico (item 8 + resultado esperado)
Adicionar card "Preços bloqueados nos últimos 30d" em `InsumosHistoricoCompras` consultando `auditoria_correcoes_precos`.

### E. Filtros faltantes em Histórico (item 1)
Adicionar filtros `destino` e `origem` (já existem campos, faltam selects).

## Plano técnico

```text
1 migração SQL:
  - ALTER notas_fiscais: + documento_hash text + idx único parcial por unidade
  - ALTER insumos_compras_historico: + motivo_revisao text
  - UPDATE tr_historico_atualiza_insumo (set motivo_revisao = 'preco_suspeito')
  - ALTER auditoria_importacao: + precos_bloqueados jsonb default '[]'

1 edição edge function:
  - supabase/functions/ingest-nota-fiscal/index.ts
    · calcular documento_hash, checar duplicidade → 200 idempotente
    · capturar preços bloqueados e fichas impactadas → gravar auditoria

3 edições frontend:
  - src/pages/InsumosRevisar.tsx → tabs Classificação | Preço suspeito
  - src/pages/InsumosHistoricoCompras.tsx → filtros destino/origem + KPI bloqueados
  - (opcional) src/components/insumos/InsumosSubTabs.tsx → contador na aba
```

## Garantias preservadas

- Nenhum DELETE em dados existentes.
- `documento_hash` é coluna nova nullable — notas antigas continuam intactas.
- Trava de preço já existente continua; só adiciona rótulo de motivo.
- Fichas técnicas: vínculo `insumo_comprado_id` permanece intocado.
- RLS, auth, n8n, cascata-preço-CMV, deduplicar_insumo_comprado: sem mudança.

## Resultado

As 6 perguntas do "resultado esperado" passam a ser respondíveis:
- Muçarela/tomate por período → já funciona via `vw_historico_compras_completo`.
- Compras por fornecedor → já funciona.
- Itens mal classificados → aba Classificação.
- Compras que impactam ficha → `auditoria_importacao.fichas_impactadas` (novo).
- **Preços bloqueados** → KPI + `auditoria_correcoes_precos` (novo card).

Aprova? Sigo com a migração + as 4 edições acima.
