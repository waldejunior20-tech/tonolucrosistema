
## Problema confirmado

A tela **Precificação de Pizzas** usa regras de cor locais diferentes do resto do sistema:

| Local | Verde | Amarelo | Vermelho |
|---|---|---|---|
| `pricing-helpers.ts` (Abrasel — usado em Fichas Técnicas, Dashboard) | 25% – 35% | 35% – 40% | > 40% |
| `PrecificacaoPizzas.tsx` (regra local — bug) | ≤ 30% | 30% – 35% | > 35% |

Por isso **CMV 30,5% aparece amarelo** nessa tela, mesmo estando dentro da faixa saudável Abrasel (25–35%). O preço de R$ 50 está **correto e saudável** — o problema é só a cor.

Além disso, o usuário não entende a diferença entre **Preço Sugerido** (mínimo para bater meta de markup) e **CMV%** (custo/preço de venda). Falta sinalização visual explicando.

## O que vai ser feito

### 1. Unificar faixas de CMV (corrige o bug do amarelo)
Em `src/pages/PrecificacaoPizzas.tsx`:
- Remover as funções locais `getCmvPillStyle`, `getHealthColor` e os ternários inline com limites 30/35.
- Usar os helpers compartilhados `cmvColor`, `cmvBg`, `cmvMessage` de `pricing-helpers.ts` (faixas Abrasel 25/35/40).
- Atualizar também o contador "Precisam de atenção" para usar o mesmo critério (CMV > 40 = vermelho).

Resultado: CMV 30,5% passará a aparecer **verde** (faixa ideal), consistente com as Fichas Técnicas.

### 2. Tooltip explicativo no card de cada tamanho
No card de Tamanho P/M/G, adicionar um ícone `(i)` com tooltip ao lado de:
- **SUGERIDO**: "Preço mínimo para cobrir custo do produto + custos fixos + taxas + seu lucro desejado. Cobrar acima é melhor, cobrar abaixo aperta sua margem."
- **CMV %**: "Quanto do preço de venda é consumido pelo custo do produto. Ideal entre 25% e 35% (padrão Abrasel)."

### 3. Legenda das faixas de CMV
Adicionar uma faixa horizontal discreta no topo da página (abaixo do título) mostrando as 4 faixas com cores e rótulos curtos:
```text
< 25% Margem alta  |  25–35% Ideal  |  35–40% Atenção  |  > 40% Prejuízo
```
Assim o usuário entende as cores sem precisar abrir tooltip.

## Detalhes técnicos

- **Arquivo principal**: `src/pages/PrecificacaoPizzas.tsx` (linhas ~329, 336, 467, 554-557).
- **Helpers reutilizados**: `cmvColor`, `cmvBg`, `cmvMessage` já existentes em `src/lib/pricing-helpers.ts` (não precisa criar nada novo).
- **Para os badges pill** (que hoje usam estilo inline com `hsl(var(--warning))`), trocar por classes Tailwind do `cmvBg` que já retornam combo bg+text+border consistente com o tema.
- **Para o glow do border do card** (linha 554), substituir os ternários por uma função baseada em `cmvColor` que mapeia para os tokens semânticos `success`/`warning`/`destructive`.
- **Tooltip**: usar o componente `Tooltip` já existente em `src/components/ui/tooltip.tsx` com ícone `Info` do lucide-react.

## Fora do escopo

- Não vou mexer na fórmula de Preço Sugerido (ela está correta — markup + meta CMV, pegando o maior).
- Não vou alterar Precificação de Produtos/Bebidas nesta rodada (mas se você quiser depois, é só pedir — a mesma padronização se aplica).
