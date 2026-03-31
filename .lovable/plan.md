

## Plan: Simulador de Combos (substituir Combos Fixos)

### Summary
Replace the placeholder "Combos Fixos" page at `/promocoes/combos` with a fully functional ComboSimulator component connected to Supabase. Users can build combos by selecting items from pizzas, products, and beverages, see real-time cost/margin calculations, and save promotions.

### Database

**New table: `combos_fixos`**
```sql
CREATE TABLE public.combos_fixos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  itens jsonb NOT NULL DEFAULT '[]',
  preco_venda numeric NOT NULL DEFAULT 0,
  custo_total numeric NOT NULL DEFAULT 0,
  preco_separado numeric NOT NULL DEFAULT 0,
  margem numeric NOT NULL DEFAULT 0,
  user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.combos_fixos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own combos" ON combos_fixos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own combos" ON combos_fixos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own combos" ON combos_fixos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own combos" ON combos_fixos FOR DELETE USING (auth.uid() = user_id);
```

The `itens` JSONB column stores an array of objects: `{ tipo, id, nome, quantidade, custo_unitario, preco_unitario }`.

### Frontend

**1. Create `src/pages/ComboSimulator.tsx`**

Based on the provided component layout, but fully wired:

- **State**: `nome`, `itens[]`, `precoVenda`, `showProductPicker`
- **Data fetching** (React Query):
  - `fichas_tecnicas_pizza` with their ingredients to compute cost per pizza (same logic as PrecificacaoPizzas)
  - `fichas_tecnicas_produtos` with their ingredients for product costs
  - `insumos_comprados` WHERE `categoria = 'Bebidas'` for beverage costs
- **Product picker dialog**: A modal/sheet listing available items grouped by type (Pizzas, Produtos, Bebidas). Selecting an item adds it to the combo with its computed cost and sale price.
- **Cost computation**:
  - Pizza cost: sum of ingredient costs (same formula as existing precificacao pages)
  - Product cost: sum of ingredient costs from fichas_tecnicas_produtos_ingredientes
  - Beverage cost: `preco_pago` from insumos_comprados (unit cost)
- **Sale price sources**:
  - Pizza: `preco_venda_p/m/g` from fichas_tecnicas_pizza (user picks size)
  - Product: `preco_venda` from precificacao_produtos or fichas_tecnicas_produtos
  - Beverage: `preco_venda` from precificacao_bebidas
- **Right panel calculations**:
  - Custo Real Total = sum of all item costs
  - Preco Separado = sum of all item sale prices
  - Margem % = `(precoVenda - custoTotal) / precoVenda * 100`
  - Traffic light: green (>50%), yellow (30-50%), red (<30%)
- **Save**: upsert to `combos_fixos` table
- **List saved combos**: show existing combos below the simulator with edit/delete

**2. Update `src/App.tsx`**
- Import ComboSimulator
- Replace `<SectionPage />` at `/promocoes/combos` with `<ComboSimulator />`

**3. Update `src/pages/SectionPage.tsx`**
- Remove the `/promocoes/combos` entry from the titles map (no longer needed)

### Styling
Uses the Midnight Ember design system already in place -- dark surfaces, ember/gold accents, monospace numbers, semantic profit/loss colors for the traffic light.

