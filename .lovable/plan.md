

## Diagnóstico e Plano — Upgrade Visual do Layout

### Por que o layout parece genérico

O problema principal: as páginas usam componentes Shadcn/UI padrão (Table, Dialog, Button, Card) com estilização mínima. Embora o tema "Midnight Ember" esteja bem definido no CSS (cores, tipografia, classes utilitárias), **as páginas não aproveitam esses recursos**. Exemplos concretos:

- **InsumosComprados**: tabela crua sem cabeçalho visual, sem KPIs resumidos, sem empty state ilustrado
- **Dashboard**: usa `card-premium` mas os KPIs são textuais sem hierarquia visual forte
- **Header**: busca sem funcionalidade, sem breadcrumbs, sem saudação personalizada
- **Tabelas**: sem alternância de cor, sem hover diferenciado, sem paginação estilizada
- **Mobile (360px)**: sidebar colapsa mas não vira drawer, tabelas não são responsivas

### O que vou fazer (redesign aplicado)

**1. Componentes compartilhados de layout premium**
- `PageHeader` — título + descrição + breadcrumb + ação primária (botão), padronizado em todas as páginas
- `KpiCard` — componente reutilizável com ícone, label-upper, kpi-number animado (contagem progressiva), trend badge, e glow sutil
- `DataTable` wrapper — tabela com header estilizado (fundo `secondary`), hover com borda ember, empty state com ilustração, paginação integrada
- `EmptyState` — ícone grande + texto + CTA, usado quando listas estão vazias

**2. Dashboard redesenhado**
- Saudação com nome do negócio + hora do dia ("Boa tarde, Pizzaria do João")
- KPI cards com animação de contagem (0→valor em 800ms)
- Gráfico com fundo gradiente sutil, sem grid lines (conforme diretrizes)
- Card de alertas com timeline visual (bolinha + linha)
- Seção de atalhos rápidos (cards menores linkando para ações frequentes)

**3. Sidebar mobile**
- Em telas < 768px, sidebar vira drawer (Sheet) com overlay, abre via botão hamburger no Header
- Fecha ao navegar

**4. Header aprimorado**
- Breadcrumb dinâmico baseado na rota atual
- Avatar com iniciais coloridas (em vez de ícone genérico)
- Busca funcional com Command Palette (Cmd+K) usando o componente Command já existente

**5. Tabelas responsivas**
- Em mobile: tabelas viram cards empilhados (cada row = um card com labels)
- Desktop: hover com highlight ember, zebra striping sutil

**6. Aplicar em todas as páginas existentes**
- InsumosComprados, InsumosProduzidos, FichasTecnicasPizza, PrecificacaoPizzas, FinanceiroDRE, FinanceiroContasPagar, PromocoesAtivas — todas recebem o novo `PageHeader` + `DataTable` + `EmptyState`

### Detalhes Técnicos

```text
src/components/layout/
  ├── PageHeader.tsx          (novo)
  ├── MobileSidebar.tsx       (novo — Sheet wrapper)
  ├── Header.tsx              (reescrito com breadcrumb + avatar + Cmd+K)
  └── AppLayout.tsx           (ajustado para mobile drawer)

src/components/
  ├── KpiCard.tsx             (novo)
  ├── DataTableWrapper.tsx    (novo — estilização premium)
  ├── EmptyState.tsx          (novo)
  └── AnimatedNumber.tsx      (novo — contagem progressiva)

Páginas modificadas:
  - Dashboard.tsx (redesign completo)
  - InsumosComprados.tsx, InsumosProduzidos.tsx
  - FichasTecnicasPizza.tsx, FichasTecnicasProdutos.tsx
  - PrecificacaoPizzas.tsx, PrecificacaoProdutos.tsx, PrecificacaoBebidas.tsx
  - FinanceiroDRE.tsx, FinanceiroContasPagar.tsx
  - PromocoesAtivas.tsx
```

### O que NÃO muda
- Tema de cores (Midnight Ember permanece)
- Lógica de negócio e queries Supabase
- Estrutura de rotas
- Autenticação

### Resultado esperado
Interface com aspecto de **SaaS fintech premium** — consistente entre páginas, responsiva em mobile, com micro-animações e hierarquia visual clara. Sai do "template genérico" para algo que parece produto pago.

