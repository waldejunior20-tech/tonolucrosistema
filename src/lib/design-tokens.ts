/**
 * ═══════════════════════════════════════════════════════════
 * DESIGN TOKENS — Single source of truth for the design system
 * ═══════════════════════════════════════════════════════════
 *
 * All semantic colors, spacing, radii, and typography tokens.
 * Components should use Tailwind classes mapped to these tokens
 * (defined in tailwind.config.ts) or CSS variables (index.css).
 *
 * NEVER use raw hex codes in components. Always reference tokens.
 */

// ─── Color Tokens (HSL values for CSS variables) ─────────────────
export const colors = {
  text: {
    primary: "222 47% 11%",    // #0F172A equiv — main text
    heading: "222 47% 11%",    // #111827 equiv — headings
    secondary: "215 25% 27%",  // #334155 equiv — secondary text
    muted: "215 16% 47%",      // #64748B equiv — muted/placeholder
  },
  surface: {
    page: "210 40% 98%",       // #F8FAFC — page background
    card: "0 0% 100%",         // #FFFFFF — card background
    muted: "210 20% 98%",      // #F9FAFB — muted surfaces
    stripe: "220 14% 96%",     // #F3F4F6 — alternating rows
    tableHeader: "217 33% 17%",// #1E293B — dark table headers
  },
  semantic: {
    success: "160 84% 39%",    // #10B981 — success/profit/emerald
    warning: "38 92% 50%",     // #F59E0B — warning/amber
    danger: "0 72% 51%",       // #DC2626 — danger/destructive/red
    info: "239 84% 67%",       // #6366F1 — info/indigo
  },
  brand: {
    primary: "160 84% 39%",    // Emerald — main brand
    accentStart: "24 100% 50%",// #FF8C00 — gradient start (orange)
    accentEnd: "16 89% 54%",   // #F27121 — gradient end (orange)
  },
  // Gradient presets for KPI cards
  gradients: {
    faturamento: { from: "142 76% 19%", to: "152 40% 33%" },  // Deep emerald
    gastos: { from: "30 82% 31%", to: "36 77% 49%" },         // Burnt orange
    lucroPos: { from: "142 64% 24%", to: "142 71% 45%" },     // Green
    lucroNeg: { from: "0 63% 31%", to: "0 72% 42%" },         // Burgundy/red
    cmvOk: { from: "210 51% 25%", to: "217 91% 60%" },        // Deep blue
    cmvBad: { from: "0 63% 31%", to: "0 72% 42%" },           // Same as lucroNeg
  },
} as const;

// ─── Spacing Scale ───────────────────────────────────────────────
export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "32px",
  "4xl": "40px",
  "5xl": "48px",
} as const;

// ─── Border Radius Scale ─────────────────────────────────────────
export const radii = {
  xs: "6px",
  sm: "8px",
  md: "10px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  pill: "9999px",
} as const;

// ─── Typography Scale ────────────────────────────────────────────
export const fontSize = {
  "2xs": "10px",
  xs: "11px",
  sm: "12px",
  base: "13px",
  md: "14px",
  lg: "16px",
  xl: "18px",
  "2xl": "20px",
  "3xl": "24px",
  "4xl": "28px",
  "5xl": "36px",
} as const;

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;
