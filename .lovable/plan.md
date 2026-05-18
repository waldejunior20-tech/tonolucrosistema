# Refino Global TôNoLucro — Padronização Visual

Escopo grande. Vou dividir em **2 fases** pra você aprovar antes de eu sair editando 40+ arquivos.

---

## FASE 1 — Componentes globais (base do sistema)

Criar/consolidar em `src/components/layout/`:

| Componente | Status | Ação |
|---|---|---|
| `PageHeader` | ✅ existe | Padronizar espaçamento + slot de ação à direita |
| `PageTabs` / `SectionTabs` | ✅ existe | Já está pronto — só garantir uso em todas as páginas |
| `MetricCard` | ❌ criar | Card pequeno: label, valor (tabular), delta opcional, ícone |
| `HeroStatusCard` | 🟡 parcial (SaldoHero/Hero do Histórico) | Extrair para componente único com variantes `positive\|negative\|warning\|neutral` |
| `DataTable` | ❌ criar wrapper | Em cima de `ui/table` — header sticky, tabular-nums, row height, hover, slot de ações |
| `AlertBanner` | ❌ criar | Variantes `warning\|danger\|info\|success` + CTA opcional |
| `EmptyState` | ✅ existe | Adicionar slot `action` (CTA primário) |
| `FilterBar` | ❌ criar | Container: busca + chips de categoria + ordenação + filtros extras |

**Tokens globais** (`index.css`):
- Confirmar paleta semântica: `--positive` (azul), `--negative` (vermelho), `--warning` (laranja), `--success` (verde).
- Fundo página: gradiente claro já usado no Histórico → mover pra util `.page-bg`.
- Remover glows coloridos vazando (auditar `shadow-[...]` com cores saturadas).

---

## FASE 2 — Aplicação por página

Só começa depois que Fase 1 estiver de pé. Cada página é uma PR mental separada:

1. **Dashboard** — bloco "Ações recomendadas" (lista priorizada de decisões).
2. **Banco de Insumos** — remover col. Fornecedor; reduzir "Em fichas" pra badge; busca sem fornecedor; badge "custo desatualizado".
3. **Histórico de Compras** — coluna/badge de status (atualizado, só financeiro, bloqueado, revisão) + `FilterBar` com filtro por status + CTA "revisar suspeitas".
4. **Fichas Técnicas** — cards de categoria com contadores (receitas / incompletas / CMV alto) + bloco "Precisam atenção".
5. **Precificação** — `MetricCard` no topo; tabela com preço praticado / sugerido / CMV / lucro / status + ordenação.
6. **Financeiro** — coluna "Saldo do dia" no Caixa; ações via padrão global.
7. **Configurações** — agrupar em blocos (Card sections); dirty-state badge; barra de salvar sticky.
8. **Saúde do Sistema** — substituir empty state por painel: WhatsApp / n8n / webhook / IA / Supabase, cada um com status + ações (testar, logs, reprocessar).

---

## Decisões que preciso de você

1. **Tamanho da entrega**: faço **Fase 1 inteira agora** (~8 componentes, sem mexer nas páginas ainda) e te mostro? Ou prefere que eu já aplique numa página piloto (sugiro Histórico de Compras) pra você ver o resultado real antes de eu refatorar tudo?
2. **HeroStatusCard**: o hero atual do Histórico (gradiente azul profundo + glows) é a referência visual? Você disse "sem glow vazando" — devo **reduzir** os glows do hero atual ou **manter** só ele e proibir em outros lugares?
3. **DataTable**: posso assumir que toda tabela do sistema migra pra ele, mesmo que isso quebre layouts customizados temporariamente até eu ajustar página por página?

Responde essas 3 e eu começo.