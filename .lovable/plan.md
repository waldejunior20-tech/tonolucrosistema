

## Refatoração da Ficha Técnica de Pizza — só estrutura, mantém visual atual

Aplicando o fluxo aprovado do protótipo dentro da skin atual (slate/zinc + emerald/burgundy, Inter, `card-premium`).

### O que muda em `src/pages/FichasTecnicasPizza.tsx`

**1. Header sticky** — faixa fixa com Custo P/M/G + Preço Sugerido + badge CMV em tempo real. Usa `Card` atual + cores semânticas.

**2. Barra de Bases** — `BaseSelector` já existente, posicionado abaixo do header sticky.

**3. Tabela densa de ingredientes** (substitui cards verticais):
```text
| Ingrediente | Origem | Qtd P | Qtd M | Qtd G | Custo P | Custo M | Custo G | 🗑 |
```
- `Table` do design system (zebra + hover já vêm).
- Badge "base" (emerald) ou "único" (laranja) na coluna Origem.
- Borda esquerda emerald nas linhas vindas da base.
- Inputs inline 36px, tabular-nums.
- Ações aparecem só no hover.
- Tab navega Qtd P → M → G → próxima linha.

**4. Seção "Embalagens por Tamanho"** — card separado com 3 mini-cards (P/M/G) + grid de extras (sachês, mesinha). Aviso âmbar quando faltar tamanho.

**5. Footer sticky** — Custo total P/M/G + lucro estimado (verde/vermelho) + botões Cancelar | Salvar como base | Salvar ficha.

**6. Validação inline** — input vermelho se Qtd > 999 ou negativa; warning âmbar em mismatch de família de unidade (reaproveita `familiaUnidade`).

### O que NÃO muda
Paleta, fontes, radius, `card-premium`, `Table`, `Button`, hooks (`useBasesFicha`, `useAplicarBase`, `useSalvarComoBase`), migration `bases_ficha`, lógica de cálculo/conversão/salvamento.

### Arquivos afetados
- `src/pages/FichasTecnicasPizza.tsx` — refatoração do form (único arquivo pesado)
- `src/components/fichas/BaseSelector.tsx` — pequeno ajuste de espaçamento

### Fora do escopo agora
- Replicar layout em Produtos/Bebidas (depois, após validar pizza)
- Atalhos de teclado avançados (Enter=salvar, Esc=cancelar) — segunda passada se quiser

