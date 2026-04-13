

## Plan: Remove gray backgrounds from pizza pricing expanded cards

The user wants to remove the gray (`rgba(200, 200, 200, ...)`) backgrounds from the "Tamanho P" badge and the "Custo / Sugerido" info block inside the expanded pizza cards, reverting them to transparent/no background.

### Changes in `src/pages/PrecificacaoPizzas.tsx`:

1. **Line 574** — Remove `style={{ background: 'rgba(200, 200, 200, 0.35)' }}` from the "Tamanho" badge, making it transparent
2. **Line 588** — Remove `style={{ background: 'rgba(200, 200, 200, 0.3)' }}` from the Custo/Sugerido info block, making it transparent

Both elements will keep their padding, rounded corners, and text styling -- just no gray background fill.

