## Objetivo

Reconstruir a tela de Fichas Técnicas com (1) uma página de listagem unificada com abas por tipo de produto e (2) um modal em formato de **wizard de 4 passos** para cadastro/edição, mantendo o tema claro atual.

---

## 1. Página de listagem unificada — `/fichas`

Criar uma nova página `src/pages/FichasTecnicas.tsx` que substitui `FichasTecnicasPizza.tsx` e `FichasTecnicasProdutos.tsx` na navegação. Atualizar `UnifiedSidebar` e rotas em `App.tsx` (mantendo redirects das rotas antigas).

**Estrutura:**
- `PageHeader` com título "Fichas Técnicas" + botão `[+ Nova Ficha]` que abre o wizard.
- Abas (shadcn `Tabs`): `🍕 Pizzas` · `🥟 Pasteis` · `🍔 Hamburguers` · `🥤 Bebidas Industrial` · `🍹 Bebidas Artesanais`.
- Tabela única por aba com colunas: **NOME | TIPO | CUSTO | PREÇO VENDA | LUCRO | MARGEM | AÇÕES**.
- Badge de margem: `>40%` verde (`#059669`), `15–40%` amarelo (`#D97706`), `<15%` vermelho (`#DC2626`).
- Ações por linha: editar (abre wizard preenchido), duplicar, excluir.
- Empty state por aba: "Nenhuma ficha de [tipo] cadastrada" + CTA `[+ Criar primeira ficha]`.

**Fonte de dados:**
- Pizzas → `fichas_tecnicas_pizza` (já existe; usar tamanho M como referência para custo/preço/margem na coluna).
- Pasteis / Hamburguers / Bebidas Artesanais → `fichas_tecnicas_produtos` filtrando por coluna `categoria` (`pastel`, `hamburguer`, `bebida_artesanal`).
- Bebidas Industrial → `fichas_tecnicas_produtos` com `categoria = 'bebida_industrial'` (sem ingredientes, só custo/preço de venda do insumo).

Custo é calculado via hook existente `useProductCosts` (pizzas) e cálculo equivalente para produtos.

---

## 2. Wizard modal — `src/components/fichas/FichaWizard.tsx`

Novo componente que substitui os modais atuais. Um `Dialog` shadcn com header mostrando o passo atual (`Passo X de 4 — título`) + barra de progresso. Apenas um passo visível por vez. Botões `[← Voltar]` e `[Próximo →]` no rodapé; último passo mostra `[💰 Salvar Ficha]`.

### Step 1 — "O que você vai cadastrar?"
- Seletor visual de tipo (5 cards clicáveis com emoji): Pizza, Pastel, Hamburguer, Bebida Industrial, Bebida Artesanal. Bloqueado em modo edição.
- Inputs: **Nome**, **Categoria** (texto livre/sugestões), **Código** (auto-gerado — ex: `PZ-001`, `PA-001`, `HA-001`, `BI-001`, `BA-001`; readonly mas editável).

### Step 2 — "Ingredientes / Composição"
- Para **Pizza**: sub-abas internas `[P] [M] [G]` — só um tamanho visível por vez (resolve o problema das 9 colunas).
- Para **Pastel / Hamburguer / Bebida Artesanal**: lista única.
- Para **Bebida Industrial**: este passo é substituído por um formulário simplificado — selecionar insumo comprado de origem (custo automático) + embalagem opcional.
- Cada ingrediente é renderizado como **card vertical** (não tabela densa):
  ```
  ┌────────────────────────────────────────┐
  │ Mussarela                       [🗑️]  │
  │ [200] [g ▼]   R$ 0,04/g   = R$ 8,00   │
  └────────────────────────────────────────┘
  ```
- Botão `[+ Adicionar Ingrediente]` com busca inline (Combobox sobre `insumos_comprados` + `insumos_proprios`).
- Rodapé do passo: **"Custo acumulado: R$ X,XX"** atualizado em tempo real.

### Step 3 — "Embalagens e Custos Extras" (opcional)
- Collapsible. Botão `[Pular]` no rodapé.
- Embalagem: select de insumo + custo. Para pizza, um campo por tamanho.
- Campo opcional **Modo de preparo** (textarea) — movido pra cá conforme pedido.

### Step 4 — "Precificação e Lucro"
- Linha 1: `Custo total: R$ X,XX` (read-only, calculado).
- Selects: `Taxa iFood` (default 14%), `Taxa cartão` (default 3,5%) — vêm de `configuracoes_precificacao`.
- Slider: **Markup desejado** 0–200% (default 80%).
- Bloco grande:
  - **PREÇO SUGERIDO: R$ XX,XX** (font 32px, Plus Jakarta 700)
  - **LUCRO POR UNIDADE: R$ X,XX**
  - **MARGEM: XX%** (badge verde/amarelo/vermelho)
- Fórmula: `preco_sugerido = custo_total × (1 + markup) / (1 - taxa_ifood - taxa_cartao)`.
- Para pizza, mostra os 3 valores P/M/G empilhados.
- `[💰 Salvar Ficha]` → grava em `fichas_tecnicas_pizza` ou `fichas_tecnicas_produtos` + ingredientes correspondentes.

---

## 3. Detalhes técnicos

```text
src/
├── pages/
│   └── FichasTecnicas.tsx        (NOVO — substitui as 2 páginas)
├── components/fichas/
│   ├── FichaWizard.tsx           (NOVO — modal wizard)
│   ├── wizard/
│   │   ├── Step1Tipo.tsx
│   │   ├── Step2Ingredientes.tsx
│   │   ├── Step3Embalagens.tsx
│   │   ├── Step4Precificacao.tsx
│   │   └── IngredienteCard.tsx
│   └── (mantém BaseSelector, BordasSection etc. para compat)
└── hooks/
    └── useFichasUnificadas.ts    (NOVO — query unificada por tipo)
```

- Categorias armazenadas em `fichas_tecnicas_produtos.categoria`: `pastel`, `hamburguer`, `bebida_industrial`, `bebida_artesanal`. Sem migração de schema.
- Geração do código: `${prefixo}-${(count+1).toString().padStart(3,'0')}` consultando contagem por tipo na unidade ativa.
- Reaproveitar `MoneyInput`, `formatCurrency`, `useActiveUnidade`.
- Mantém o tema claro / tokens já aplicados; usa `card-flat`, `kpi-number`, badges existentes.
- Rotas antigas `/fichas/pizzas` e `/fichas/produtos` redirecionam para `/fichas?tab=pizzas` e `/fichas?tab=pasteis` respectivamente para não quebrar links.

---

## 4. Fora de escopo (não muda agora)

- Caixa Diário, Insumos, Configurações, Dashboard.
- Schema do banco — só usa colunas existentes.
- Lógica de bordas de pizza (mantém `BordasSection` acessível dentro do Step 3 para pizza).
