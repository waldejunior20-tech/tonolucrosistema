
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  colorStorageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  accentColor: "#C0392B",
  setAccentColor: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  colorStorageKey = "vite-ui-color",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );
  
  const [accentColor, setAccentColor] = useState<string>(
    () => localStorage.getItem(colorStorageKey) || "#C0392B"
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Helper to convert hex to dark version (simplified logic)
    const getDarkColor = (hex: string) => {
      // In a real app we'd use a library, but here we can just map the 5 specific colors
      const colorMap: Record<string, string> = {
        "#C0392B": "#922B21", // Red
        "#1A5276": "#154360", // Navy
        "#1E8449": "#145A32", // Green
        "#6C3483": "#512E5F", // Purple
        "#784212": "#4E2C0C", // Brown
      };
      return colorMap[hex] || hex;
    };

    root.style.setProperty("--red", accentColor);
    root.style.setProperty("--red-dark", getDarkColor(accentColor));
    root.style.setProperty("--red-glow", `${accentColor}40`); // 25% opacity
    
    localStorage.setItem("vite-ui-color", accentColor);
  }, [accentColor]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    accentColor,
    setAccentColor: (color: string) => {
      setAccentColor(color);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
}
