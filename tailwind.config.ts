import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
        label: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "hsl(var(--primary-light))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        orange: {
          DEFAULT: "hsl(var(--orange-accent))",
          foreground: "hsl(0 0% 100%)",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        info: "hsl(var(--info))",
        // ═══ Semantic Surface Tokens ═══
        "surface-page": "hsl(var(--surface-page))",
        "surface-card": "hsl(var(--surface-card))",
        "surface-muted": "hsl(var(--surface-muted))",
        "surface-stripe": "hsl(var(--surface-stripe))",
        "surface-table-header": "hsl(var(--surface-table-header))",
        // ═══ Semantic Text Tokens ═══
        "text-heading": "hsl(var(--text-heading))",
        "text-secondary": "hsl(var(--text-secondary))",
        "text-muted": "hsl(var(--text-muted))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        /* Escala premium unificada — alinhada com --radius-* do index.css */
        xs: "var(--radius-xs)",     /*  8px — badges, pills */
        sm: "var(--radius-sm)",     /* 12px — pequenos containers */
        md: "var(--radius-md)",     /* 14px — inputs */
        lg: "var(--radius-lg)",     /* 16px — botões */
        xl: "var(--radius-xl)",     /* 18px — cards pequenos */
        "2xl": "var(--radius-2xl)", /* 22px — cards médios */
        "3xl": "var(--radius-3xl)", /* 28px — hero cards */
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        /* Sombras neutras, premium, sem cor — Stripe/Linear feel */
        card: "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px -4px rgba(15,23,42,0.06)",
        "card-hover": "0 2px 4px rgba(15,23,42,0.05), 0 12px 28px -8px rgba(15,23,42,0.10)",
        "card-ember": "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px -4px rgba(15,23,42,0.06)",
        "glow-ember": "none",
        "glow-profit": "none",
        button: "0 1px 2px rgba(15,23,42,0.06)",
        tooltip: "0 8px 24px -4px rgba(15,23,42,0.12)",
        sidebar: "1px 0 2px rgba(15,23,42,0.03)",
        glass: "0 12px 32px -8px rgba(15,23,42,0.10)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
