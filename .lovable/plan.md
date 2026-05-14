# Arquitetura de Classificação, Histórico e Revisão de Destino

Objetivo: separar com clareza **insumo canônico**, **histórico de compras**, **despesa financeira** e **fila de revisão** — sem apagar dados, sem mesclar automaticamente, sem quebrar fichas técnicas.

---

## Princípio central

`insumos_comprados` = **registro canônico** (1 linha por ingrediente real).
`insumos_compras_historico` = **memória completa** (1 linha por compra).
`lancamentos_financeiros` / `contas_a_pagar` = **despesas que não montam ficha**.
`notas_fiscais_pendentes` (estendida) = **fila de revisão** quando o destino é incerto.

Tomate no Brisa R$15 + Tomate no Zago R$2 → **1** insumo "TOMATE", 2 linhas no histórico, preço atual = R$2 (Zago, mais recente).

---

## 1. Banco de dados (migração única, não-destrutiva)

### 1.1 Tabela nova `regras_classificacao`
Regras aprendidas por fornecedor/item para próximas importações.

Campos: `unidade_id`, `escopo` (`fornecedor` | `item` | `fornecedor+item`), `chave_normalizada`, `destino` (`insumo` | `embalagem` | `financeiro` | `conta_pagar`), `categoria`, `subcategoria`, `confianca` (0–1), `criado_por` (`usuario` | `sistema`), `aprovada` (bool), `vezes_aplicada`, timestamps. RLS por unidade.

### 1.2 Tabela nova `auditoria_importacao`
Trilha do que aconteceu em cada NF/cupom: `nota_fiscal_id`, `itens_lidos`, `enviados_insumos`, `enviados_financeiro`, `pendentes_revisao`, `regras_aplicadas` (jsonb), `duplicados_sugeridos`, `fichas_impactadas`. Append-only.

### 1.3 Coluna `destino` em `insumos_compras_historico`
Enum textual: `insumo` | `embalagem` | `financeiro` | `conta_pagar` | `revisar`. Default `insumo`. Permite o histórico mostrar tudo, mesmo o que virou despesa.

### 1.4 View `vw_historico_compras_completo`
Junta `insumos_compras_historico` + `notas_fiscais` + `lancamentos_financeiros` + `insumos_comprados` (canônico) + categoria/destino. Base da nova tela de Histórico.

### 1.5 View `vw_revisar_classificacoes`
Itens em `notas_fiscais_pendentes` com `status = aguardando_revisao` + itens do histórico com `destino = revisar` ou confiança < 0.7.

### 1.6 Trigger `tr_aplicar_regra_classificacao`
Em INSERT em `insumos_compras_historico`: consulta `regras_classificacao` aprovadas; se houver match → aplica destino/categoria, incrementa `vezes_aplicada`. Se não houver e confiança < 0.7 → marca `destino = revisar`.

### 1.7 Função `aprovar_classificacao(item_id, destino, categoria, criar_regra)`
SECURITY DEFINER. Atualiza o item, opcionalmente insere regra aprovada, registra na auditoria. Não toca em fichas técnicas.

**Preservação garantida**: nada é deletado. `deduplicar_insumo_comprado` (trigger existente) continua intacto. Mesclagem manual segue via edge function `mesclar-insumos` já existente.

---

## 2. Edge Functions

### 2.1 `ingest-nota-fiscal` (existente — ajuste leve)
Após classificar item: se destino sugerido = `financeiro` → cria `lancamentos_financeiros` em vez de `insumos_comprados`. Sempre grava em `insumos_compras_historico` com `destino` correto. Sempre registra `auditoria_importacao`.

### 2.2 `revisar-classificacao` (nova)
POST `{ item_id, destino, categoria, subcategoria, criar_regra }`. Move o item entre tabelas se destino mudou (insumo↔financeiro), preserva histórico original, opcionalmente cria regra aprovada.

### 2.3 `mesclar-insumos` (existente — sem mudança)

---

## 3. Frontend — 4 abas em `/insumos/comprados/*`

Reaproveita `InsumosSubTabs.tsx` já criado. Nova ordem:

1. **Insumos Comprados** (`/insumos/comprados`) — já implementado, sem mudança visual
2. **Histórico de Compras** (`/insumos/comprados/historico`) — estender o existente com filtros novos
3. **Revisar Classificações** (`/insumos/comprados/revisar`) — **nova página**
4. **Revisar Duplicados** (`/insumos/comprados/duplicados`) — já implementado

### 3.1 Histórico de Compras — filtros adicionais
Períodos (7/30/90d, este mês, mês passado, custom) · fornecedor · categoria · item canônico · destino · origem (WhatsApp/manual/import). KPIs no topo: total gasto, top fornecedor, item que mais subiu.

### 3.2 Revisar Classificações (nova `InsumosRevisar.tsx`)
Tabela: item · fornecedor · nome original · sugestão (destino + categoria) · confiança (badge) · data · origem.
Linha expansível com 4 ações: **Confirmar** · **Corrigir** (dialog com select de destino/categoria) · **Ignorar** · **Aprovar e aprender** (cria regra).

### 3.3 Copy (PT-BR simples)
"Para onde isso vai?" · "Isso monta ficha técnica?" · "Isso é despesa?" · "Aprovar e aprender" · "Ver fichas impactadas" · "Ver histórico". Sem termos técnicos.

---

## 4. Detalhes técnicos (referência)

### Arquivos novos
- `supabase/migrations/<ts>_classificacao_e_auditoria.sql` — tabelas, view, trigger, função
- `supabase/functions/revisar-classificacao/index.ts`
- `src/pages/InsumosRevisar.tsx`
- `src/components/insumos/RevisarClassificacaoDialog.tsx`
- `src/hooks/useRegrasClassificacao.ts`

### Arquivos editados
- `src/App.tsx` — rota `/insumos/comprados/revisar`
- `src/components/insumos/InsumosSubTabs.tsx` — adicionar aba "Revisar Classificações"
- `src/pages/InsumosHistoricoCompras.tsx` — filtros novos + KPIs
- `supabase/functions/ingest-nota-fiscal/index.ts` — roteamento por destino + auditoria

### Mantido intacto
RLS · auth · `pode_editar_negocio` · cálculo de CMV · fichas técnicas · `MoneyInput` · `useActiveUnidade` · n8n · `cascata-preco-cmv` · `deduplicar_insumo_comprado` · `tr_historico_atualiza_insumo` · `vw_insumos_canonicos`.

---

## 5. Garantias de segurança

- Nenhum DELETE em dados existentes
- Nenhuma mesclagem automática (sempre exige clique humano)
- Nenhum item movido entre tabelas sem registrar auditoria
- Nome original sempre preservado em `insumos_compras_historico.nome_original`
- Vínculos de fichas técnicas (`insumo_comprado_id`) nunca são alterados pela revisão de classificação — só pela mesclagem manual
- Total da nota nunca é ajustado para "fechar conta"
- Regras só são aplicadas se `aprovada = true`

---

## 6. Resultado esperado

Consultas que o sistema passa a responder:
- "Quanto gastei de muçarela este mês?" → Histórico filtrado por item canônico + período
- "Quanto comprei do Zago em 90d?" → Histórico filtrado por fornecedor + período
- "Quais itens subiram mais?" → Histórico ordenado por variação
- "O que está mal classificado?" → aba Revisar Classificações
- "O que não deveria estar em Insumos?" → itens com destino sugerido = financeiro
- "Quais fornecedores viram despesa?" → regras com `destino = financeiro`

Aprovação? Sigo com a migração e os arquivos listados.
