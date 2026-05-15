# Redesign do módulo de Compras (mobile-first)

Vou reformular a página `/insumos/historico-compras` mantendo toda a lógica de dados que já existe (view `vw_historico_compras_completo`, RLS, hooks), só trocando a apresentação para o padrão que você pediu.

## O que muda visualmente

### 1. Topo — período + total
- Filtros em chips horizontais: **7d · 30d · Este mês · Personalizado** (calendário)
- Total grande do período + nº de compras + variação % vs período anterior
- Visual limpo, fundo com leve degradê (igual fizemos no Caixa do Mês)

### 2. Gráfico principal — POR FORNECEDOR
- Barras horizontais empilhadas (top 5 fornecedores no período)
- Cada barra mostra: nome do fornecedor + valor gasto + % do total
- Toggle discreto pra alternar para "Por categoria" se quiser
- Tap numa barra → filtra a lista abaixo por aquele fornecedor

### 3. Lista de compras (cronológica)
- Cada linha = **uma compra** (uma "ida ao mercado"):
  - Logo/inicial do fornecedor + nome do mercado em destaque
  - Data ("Hoje", "Ontem", "12 mai")
  - Valor total da compra à direita
  - Pequeno chip mostrando "5 itens"
- Agrupadas por dia (separador "HOJE · 15 MAI")
- Tap abre o cupom

### 4. Modal "Cupom" (sheet vindo de baixo)
Estilo nota fiscal:
- Cabeçalho: nome do fornecedor + data + nº da nota (se tiver)
- Lista de itens, cada um:
  - Nome do insumo + qtd × unidade
  - Preço unitário
  - **Badge de variação**: `↑ 5%` (vermelho) ou `↓ 3%` (verde) comparado à última compra do mesmo insumo
- Linha pontilhada
- **TOTAL** em destaque embaixo
- Botão "Ver insumo no histórico" pra cada item

## Técnico

- Reutiliza a query existente `vw_historico_compras_completo` (já agrupa tudo)
- Cria helper que agrupa rows por `nota_fiscal_id` (ou por fornecedor+data quando não houver NF) → cada grupo = 1 compra
- Variação de preço por item: pega o `preco_unitario` anterior do mesmo `insumo_id` da query já carregada (sem nova chamada ao banco)
- Componentes novos:
  - `ComprasPeriodoChips.tsx` — chips de período
  - `ComprasGraficoFornecedor.tsx` — barras horizontais
  - `CompraCard.tsx` — linha da lista
  - `CupomCompraSheet.tsx` — modal com itens + variação
- Mantém a tabela atual escondida em `md:` se quiser desktop, ou substitui de vez (recomendo substituir — o mobile-first fica melhor pros dois)

## Fora de escopo agora
- Não mexo em backend/RLS/migrations
- Não mexo em outras páginas (Insumos, Fichas, Dashboard)
- Não troco cores base (azul/branco continuam)
