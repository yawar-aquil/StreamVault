import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "midnight" | "ocean" | "sunset" | "forest" | "neon" | "cyberpunk" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
);

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("streamvault-theme") as Theme) || defaultTheme
  );

  useEffect(() => {
    const root = document.documentElement;
    const standardThemes = ["light", "dark", "system"];
    const premiumThemes = ["midnight", "ocean", "sunset", "forest", "neon", "cyberpunk", "neon-theme", "gold-theme", "gold", "vaporwave", "oled", "nord", "golden"];

    // Clean up all possible classes
    root.classList.remove(...standardThemes);
    premiumThemes.forEach(t => root.classList.remove(`skin-${t}`)); // Remove skin-prefixed versions
    root.classList.remove(...premiumThemes); // Safely remove raw versions just in case

    if (theme !== "system" as any) {
      const isPremium = premiumThemes.includes(theme);
      // Premium themes need the 'skin-' prefix to match index.css
      const className = isPremium ? `skin-${theme}` : theme;
      root.classList.add(className);
    }
    localStorage.setItem("streamvault-theme", theme);
  }, [theme]);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
