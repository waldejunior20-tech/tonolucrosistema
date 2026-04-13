

## Plan: Fix card-within-card double gray issue in Pizza Pricing

The problem: The outer pizza card (from the `Card` component) already has `background: rgba(211, 211, 211, 0.2)`. Inside it, each size card (P, M, G) at line 570 also has `background: 'rgba(211, 211, 211, 0.2)'`. These two translucent grays stack on top of each other, making the inner cards appear darker than intended.

### Fix

**File: `src/pages/PrecificacaoPizzas.tsx` (line 570)**

Change the inner size cards' background from `rgba(211, 211, 211, 0.2)` to `rgba(211, 211, 211, 0.13)` — a lighter opacity that, when layered on top of the outer card, produces a subtle separation without becoming noticeably darker. Keep the blur and border as-is.

This is a single-line style change. No other files affected.

