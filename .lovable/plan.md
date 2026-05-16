## Sistema de Hero Cards Global — Padronização

### O problema (diagnóstico)
Hoje cada página construiu seu próprio "card de topo" do zero. Resultado: 4 padrões diferentes coexistindo no sistema:

| Página | Padrão atual | Problema |
|---|---|---|
| Histórico de Compras | Azul degradê gigante, texto branco | Único com essa cor — vira "ilha" |
| Caixa Diário | Branco com card devedor vermelho condicional | Outro padrão visual |
| Precificação Pizzas | 2 cards brancos lado a lado, número 48px | Outro padrão |
| Dashboard / Insumos / DRE | Mistura de tudo | Caos |

Tamanhos de fonte variam de 18px a 48px sem lógica. Símbolo R$ às vezes some no fundo azul, às vezes fica pesado. Idoso não enxerga.

### A solução (uma regra para todos)

**1. Criar 2 componentes novos e únicos:**

#### `<PageHero />` — o card herói azul (sempre no topo)
- **Fundo:** `bg-gradient-to-br from-blue-600 to-blue-700` (cor base)
- **Status condicional** muda só o degradê, mantendo a identidade:
  - `neutral` (default) → azul
  - `danger` (caixa devedor, prejuízo) → `from-red-600 to-red-700`
  - `success` (lucro alto, meta batida) → `from-emerald-600 to-emerald-700`
  - `warning` (atenção) → `from-amber-600 to-amber-700`
- **Altura fixa:** ~140px desktop / ~120px mobile
- **Layout interno** (3 zonas):
  - Esquerda: `LABEL UPPERCASE 11px` + `VALOR 44px desktop / 32px mobile` (JetBrains Mono, branco, R$ a 65% scale e opacity 80%)
  - Centro/contexto: 1 linha de meta info (ex: "22 compras · 82 itens" ou "⚠ Caixa devedor")
  - Direita: slot livre opcional (filtros de período, botão CTA, ou vazio)
- **Border-radius:** 16px, sem sombra pesada, sem bordas
- Animação `fade-up` única ao montar

#### `<StatCardGrid />` — cards menores ABAIXO do hero
- Grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3`
- Cada `<StatCard />`:
  - Altura ~88px, fundo `bg-white`, borda `border-slate-100`, radius 12px
  - Label uppercase 11px slate-500
  - Valor 22px JetBrains Mono (cor semântica conforme status: verde/vermelho/foreground)
  - Ícone pequeno opcional à esquerda do label (trend up/down/neutral)
- Substitui os "mini-stats Entrou/Taxas/Saiu" que hoje vivem dentro do card herói

**2. Escala tipográfica global travada no `index.css`:**

```css
.text-hero-value     { font-size: 44px; ... }  /* desktop */
.text-hero-value-sm  { font-size: 32px; ... }  /* mobile via media query */
.text-stat-value     { font-size: 22px; ... }
.text-hero-label     { font-size: 11px; uppercase; ... }
.text-hero-context   { font-size: 13px; opacity: 0.85; ... }
```

Os tokens já existentes (`text-finance-mono`, `text-mini-label`) continuam — esses novos são específicos do hero.

**3. Símbolo R$ em fundo azul:** ajustar `<Money />` para aceitar prop `onDark` que sobe opacidade do símbolo de 60% para 80% (legibilidade em fundo colorido).

### Migração página por página (rollout)

Substituir o bloco de topo de cada uma destas páginas pelo combo `<PageHero /> + <StatCardGrid />`:

| Página | Hero atual | Status condicional? |
|---|---|---|
| `/financeiro/caixa-diario` | SaldoHero | Sim (vermelho se devedor) |
| `/compras/historico` | Card azul inline | Não, sempre azul |
| `/precificacao/pizzas` | 2 cards brancos | Sim (vermelho se CMV > 40% médio) |
| `/precificacao/produtos` | (nenhum) | Sim |
| `/precificacao/bebidas` | (nenhum) | Sim |
| `/financeiro/dre` | (nenhum) | Sim (vermelho se prejuízo) |
| `/financeiro/contas-pagar` | (nenhum) | Sim (vermelho se vencidas) |
| `/financeiro/ponto-equilibrio` | (nenhum) | Neutro |
| `/insumos/comprados` | (nenhum) | Neutro |
| `/insumos/produzidos` | (nenhum) | Neutro |
| `/insumos/historico-compras` | (nenhum) | Neutro |
| `/automacao/*` | mistos | Conforme contexto |
| `/dashboard` | MobileDashboard já tem outro padrão | Manter Dashboard intocado (caso especial) |

`<PageHeader />` (título + breadcrumb) continua acima do hero — sem mudança.

### Acessibilidade (idoso enxergando)
- Mínimo 14px em texto corrido (já é regra)
- Contraste AAA no valor herói (branco sobre azul-700: ratio 8.5:1 ✓)
- Símbolo R$ a 80% opacity em fundo colorido (vs 60% atual que vira fantasma)
- Foco visível em todo botão dentro do hero

### Detalhes técnicos

**Arquivos a criar:**
- `src/components/layout/PageHero.tsx` (componente principal)
- `src/components/layout/StatCard.tsx` + `StatCardGrid.tsx`
- Adicionar tokens `.text-hero-*` no `src/index.css`
- Estender `<Money />` com prop `onDark?: boolean`

**Arquivos a editar (substituir bloco de topo):**
- `src/pages/CaixaDiario.tsx` — remover SaldoHero, usar PageHero+StatCardGrid
- `src/pages/InsumosHistoricoCompras.tsx` — substituir card azul inline
- `src/pages/PrecificacaoPizzas.tsx` — converter os 2 KPI cards em hero+grid
- `src/pages/PrecificacaoProdutos.tsx`, `PrecificacaoBebidas.tsx`
- `src/pages/FinanceiroDRE.tsx`, `FinanceiroContasPagar.tsx`, `FinanceiroPontoEquilibrio.tsx`
- `src/pages/InsumosComprados.tsx`, `InsumosProduzidos.tsx`
- (após validação) `src/pages/AutomacaoAlertas.tsx`, `AutomacaoSaude.tsx`, etc.

**Componente `SaldoHero.tsx` será deletado** após migração do Caixa Diário.

**Dashboard fica de fora desta passada** — tem layout próprio (radar de lucro etc.) que merece tratamento separado depois.

### Ordem de execução sugerida (build mode)
1. Criar PageHero + StatCard + StatCardGrid + tokens CSS + Money.onDark (1 commit, 0 mudanças visíveis)
2. Migrar 3 páginas piloto: Caixa Diário, Histórico de Compras, Precificação Pizzas
3. Você revisa as 3 lado a lado
4. Se aprovado, migro as 9 páginas restantes em lote
5. Deletar SaldoHero antigo

### Fora de escopo
- Refatorar o Dashboard (tem layout próprio)
- Mexer em tabelas, formulários ou conteúdo abaixo do hero
- Mudar paleta de cores semânticas
- Lógica de negócio (cálculos, queries) — nada disso muda
