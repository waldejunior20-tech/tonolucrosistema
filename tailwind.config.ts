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
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        heading: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
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
        /* Alinhado com --radius-* tokens do index.css */
        xs: "var(--radius-xs)",     /* 2px  — badges, trend pills */
        sm: "var(--radius-sm)",     /* 4px  — botões, inputs */
        md: "var(--radius-md)",     /* 6px  — cards, modais, status pills */
        lg: "var(--radius-lg)",     /* 8px  — containers, tabelas */
        xl: "var(--radius-xl)",     /* 12px — cards premium, destaque */
        pill: "var(--radius-pill)", /* 9999px — avatares, tags */
      },
      boxShadow: {
        card: "0 4px 20px rgba(0,0,0,0.05)",
        "card-hover": "0 8px 30px rgba(0,0,0,0.08)",
        "card-ember": "0 0 0 1px hsl(145 63% 42% / 0.1), 0 4px 20px rgba(0,0,0,0.05)",
        "glow-ember": "0 0 16px hsl(145 63% 42% / 0.15)",
        "glow-profit": "0 0 12px rgba(0,214,143,0.10)",
        button: "0 6px 20px hsl(145 63% 42% / 0.30)",
        tooltip: "0 8px 32px rgba(0,0,0,0.12)",
        sidebar: "1px 0 4px rgba(0,0,0,0.04)",
        glass: "0 25px 60px rgba(0,0,0,0.15)",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
