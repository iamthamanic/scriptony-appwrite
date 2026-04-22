import { useState, useEffect } from "react";
import { STORAGE_KEYS } from "../lib/config";

type Theme = "light" | "dark";

export function useTheme(): {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
} {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";

    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const setTheme = (newTheme: Theme) => {
    if (typeof window === "undefined") return;

    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.classList.add(theme);
  }, [theme]);

  return { theme, setTheme, toggleTheme };
}
