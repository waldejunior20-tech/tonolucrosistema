

## Corrigir busca de ingredientes na Ficha de Pizza

### Causa raiz
O componente `Table` (`src/components/ui/table.tsx`) envolve o `<table>` em `<div className="relative w-full overflow-auto">`. Esse `overflow-auto` **clipa** qualquer popover absolute que tenta sair da célula — por isso o dropdown de busca de insumos comprados/produzidos sumiu quando a tabela densa foi adotada.

Adicionar `overflow-visible` nas células ou no wrapper externo não resolve, porque o clip é feito pela div interna do próprio `Table`.

### Solução (sem mudar visual nem layout da tabela)

**Em `src/pages/FichasTecnicasPizza.tsx`** — trocar o dropdown manual `absolute` por um **`Popover` do design system** (já usado em outras telas), que renderiza em portal e ignora qualquer overflow de ancestrais.

Estrutura nova da célula "Ingrediente" (mantém Select Comprado/Produzido + input + chip de ingrediente já selecionado, igual ao atual):

```tsx
<Popover open={buscaAberta === idx} onOpenChange={(o) => !o && setBuscaAberta(null)}>
  <PopoverTrigger asChild>
    <div className="relative">
      <Search className="absolute left-2 …" />
      <Input
        placeholder="Buscar insumo…"
        value={buscaAberta === idx ? buscaIngrediente : ""}
        onFocus={() => { setBuscaAberta(idx); setBuscaIngrediente(""); }}
        onChange={(e) => setBuscaIngrediente(e.target.value)}
      />
    </div>
  </PopoverTrigger>
  <PopoverContent
    align="start"
    className="p-0 w-[var(--radix-popover-trigger-width)] max-h-56 overflow-y-auto"
    onOpenAutoFocus={(e) => e.preventDefault()}  // mantém foco no input
  >
    {getFilteredInsumos(ing.tipo_insumo).length === 0 ? (
      <p className="p-2 text-xs text-muted-foreground">Nenhum insumo encontrado.</p>
    ) : (
      getFilteredInsumos(ing.tipo_insumo).map((item) => (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); selectInsumo(idx, item.id, item.nome, ing.tipo_insumo); }}
          className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
        >
          {item.nome}
        </button>
      ))
    )}
  </PopoverContent>
</Popover>
```

Aplicar a mesma correção nos **3 buscadores de embalagem** (Caixa P / M / G) — mesmo bug, mesmo fix.

### Detalhes que ficam preservados
- Layout da tabela densa (colunas Qtd P/M/G, Custo P/M/G).
- Sticky header de custo, footer sticky, badges "base"/"único", borda emerald nas linhas vindas da base.
- Lógica de `selectInsumo`, `getFilteredInsumos`, `matchesSearch` (busca normalizada com/sem acento).
- Ketchup/Maionese só salgadas, Mesinha em todas.
- Todos os hooks, RPC e migrations.

### Arquivo afetado
- `src/pages/FichasTecnicasPizza.tsx` — trocar 4 dropdowns `absolute` por `Popover` (1 do ingrediente + 3 das embalagens P/M/G). Remover os `overflow-visible` que adicionei no commit anterior (não fazem mais falta).

### Fora do escopo
- Mexer em `src/components/ui/table.tsx` (mudaria comportamento global).
- Tocar em Produtos/Bebidas (a busca lá usa estrutura diferente e funciona).

