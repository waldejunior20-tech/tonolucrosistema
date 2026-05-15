# Histórico de Compras como módulo próprio

Hoje "Histórico de Compras" vive embaixo de Insumos → Comprados (rota `/insumos/comprados/historico`) e aparece como sub-aba junto com "Insumos Comprados". A ideia é dar a ele uma "casa própria" no menu, separado de Insumos.

## O que muda

### 1. Navegação (sidebar desktop + menu mobile)
- Adicionar item de 1º nível **"Compras"** com ícone `History` (ou `Receipt`), logo abaixo de Insumos, apontando para `/compras/historico`.
- Remover o sub-link "Histórico de Compras" de dentro de Insumos.
- Insumos passa a ter só **Comprados** e **Produzidos** como abas (já é o caso em `InsumosCategoryTabs`); o `InsumosSubTabs` (que mostrava Comprados / Histórico) deixa de ser usado nessa página e some.

### 2. Rota
- Criar nova rota `/compras/historico` apontando para `InsumosHistoricoCompras` (mesmo componente, só renomeado conceitualmente).
- Manter `/insumos/comprados/historico` por 1 release como redirect → `/compras/historico` (não quebra links/QR antigos).

### 3. Página em si
- Remove `<InsumosCategoryTabs />` e `<InsumosSubTabs />` do topo de `InsumosHistoricoCompras.tsx` — agora ela é uma página autônoma, não vive dentro do contexto "Insumos".
- Mantém todo o resto: hero com período, gráfico por fornecedor, lista por dia, cupom-sheet. Lógica de dados intacta.

### 4. Bottom nav mobile (opcional, recomendado)
Hoje a barra inferior tem: Início · Insumos · Fichas · Caixa · Mais. Não cabe um 6º item fixo. Sugestão: **manter Compras só no menu lateral / "Mais"**, sem entrar no bottom nav (usuário acessa via gaveta). Se quiser, posso trocar Fichas por Compras no bottom nav, mas acho que Fichas é mais usado no dia a dia.

## Arquivos tocados

- `src/components/layout/UnifiedSidebar.tsx` — adicionar item "Compras" em `navigationItems`
- `src/components/layout/MobileSidebar.tsx` — refletir mesma mudança (se tiver lista própria)
- `src/components/insumos/InsumosSubTabs.tsx` — apagar (não tem mais função) ou esvaziar
- `src/pages/InsumosComprados.tsx` — remover uso de `InsumosSubTabs`
- `src/pages/InsumosHistoricoCompras.tsx` — remover `InsumosCategoryTabs` + `InsumosSubTabs` do topo
- `src/App.tsx` — adicionar rota `/compras/historico` e redirect da antiga

## Fora de escopo
- Não mexo em backend, RLS, queries.
- Não mudo o visual da página (hero, gráfico, lista continuam iguais).
- Não toco em Insumos Produzidos.

## Pergunta rápida
Confirma o nome **"Compras"** no menu? Outras opções: "Histórico de Compras", "Notas Fiscais", "Mercado". Sigo com "Compras" se você não responder.
