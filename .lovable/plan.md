

## Plano: Retrofit Completo do Design System com Tokens

### Auditoria -- O Caos Atual

Escaneei todo o codebase e encontrei:

- **30+ cores hardcoded** espalhadas em 80+ ocorrencias nas paginas
- As mais repetidas: `#334155` (15x), `#1E293B` (14x), `#10B981` (12x), `#1F2937` (11x), `#D97706` (9x), `#C0392B` (9x)
- Varias cores fazem a mesma coisa com hex diferentes (ex: `#27AE60`, `#2ECC71`, `#10B981`, `#059669`, `#22C55E`, `#15803D`, `#166534` -- todos sao "verde de sucesso")
- **7 border-radius diferentes** no CSS, mais valores inline
- **24 font-sizes** declarados no CSS global
- **9 padding scales** inconsistentes

Isso e exatamente o cenario do artigo: valores arbitrarios acumulados ao longo do desenvolvimento.

### O Que Vou Fazer

**1. Criar arquivo de Design Tokens** (`src/lib/design-tokens.ts`)

Um unico arquivo centralizado com todas as constantes semanticas:

```text
colors:
  text.primary     = slate-900 (#0F172A)
  text.secondary   = slate-700 (#334155)
  text.muted       = slate-500 (#64748B)
  text.heading     = gray-900  (#111827)
  
  surface.page     = slate-50  (#F8FAFC)
  surface.card     = white     (#FFFFFF)
  surface.muted    = gray-50   (#F9FAFB)
  surface.stripe   = gray-100  (#F3F4F6)
  
  semantic.success = emerald-500 (#10B981)
  semantic.warning = amber-500   (#F59E0B)
  semantic.danger  = red-600     (#DC2626)
  semantic.info    = indigo-500  (#6366F1)
  
  brand.primary    = emerald    (CSS var --primary)
  brand.accent     = orange     (#FF8C00 → #F27121)

spacing: 4, 8, 12, 16, 20, 24, 32, 40, 48 (9-step scale)
radii: 6, 8, 10, 12, 16, 20, 9999 (7 tokens)
fontSize: 11, 12, 13, 14, 16, 18, 20, 24, 28, 36 (10 tokens)
fontWeight: 400, 500, 600, 700, 800 (5 tokens)
```

**2. Limpar o CSS Global** (`src/index.css`)

- Remover valores hardcoded duplicados
- Substituir por referencias aos tokens via CSS custom properties
- Consolidar as 7 variantes de verde em `var(--success)`
- Consolidar as 3+ variantes de vermelho em `var(--destructive)`

**3. Substituir hardcoded nas Paginas**

Varrer todas as 15+ paginas e substituir hex codes pelos tokens:

| Hex Atual | Token Semantico |
|-----------|----------------|
| `#334155`, `#1E293B`, `#1F2937` | `colors.text.secondary` / `colors.text.heading` |
| `#10B981`, `#27AE60`, `#2ECC71`, `#059669`, `#22C55E`, `#15803D`, `#166534` | `colors.semantic.success` |
| `#C0392B`, `#B91C1C`, `#7F1D1D` | `colors.semantic.danger` |
| `#D97706`, `#F39C12`, `#F59E0B`, `#92400E` | `colors.semantic.warning` |
| `#FF8C00`, `#F27121`, `#FF9F43` | `colors.brand.accent` |

**4. Atualizar Tailwind Config**

Adicionar tokens semanticos extras no `tailwind.config.ts` para que possam ser usados como classes utilitarias (`text-heading`, `bg-surface-muted`, etc).

### Arquivos Editados

```text
NOVO:  src/lib/design-tokens.ts    -- Arquivo central de tokens
EDIT:  src/index.css                -- Limpar CSS, adicionar CSS vars
EDIT:  tailwind.config.ts           -- Tokens semanticos como classes
EDIT:  src/pages/Dashboard.tsx
EDIT:  src/pages/CaixaDiario.tsx
EDIT:  src/pages/PrecificacaoPizzas.tsx
EDIT:  src/pages/PrecificacaoProdutos.tsx
EDIT:  src/pages/PrecificacaoBebidas.tsx
EDIT:  src/pages/FinanceiroDRE.tsx
EDIT:  src/pages/FinanceiroContasPagar.tsx
EDIT:  src/pages/FinanceiroPontoEquilibrio.tsx
EDIT:  src/pages/FichasTecnicasPizza.tsx
EDIT:  src/pages/FichasTecnicasProdutos.tsx
EDIT:  src/pages/InsumosComprados.tsx
EDIT:  src/pages/InsumosProduzidos.tsx
EDIT:  src/pages/PromocoesAtivas.tsx
EDIT:  src/pages/ComboSimulator.tsx
EDIT:  src/pages/Configuracoes.tsx
```

### O Que NAO Muda

- Layout e estrutura de cada pagina
- Logica de negocios (calculos, auto-save, queries)
- Componentes UI do shadcn (button, input, card, etc)
- A aparencia visual final -- os tokens mapeiam para as mesmas cores, apenas centralizados

### Resultado

De **30+ cores hardcoded em 80+ lugares** para **~15 semantic tokens** em 1 arquivo. Qualquer mudanca futura de paleta se faz em um unico lugar.

