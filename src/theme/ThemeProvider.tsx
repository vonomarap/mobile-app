import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { ColorSchemeName, useColorScheme } from "react-native";
import { APP_THEME_MODE_KEY, getPreference, setPreference } from "../services/preferences-storage";
import { Theme, createTheme } from "./theme";

const ThemeContext = createContext<Theme | null>(null);
type ThemeMode = "system" | "light" | "dark";
type ThemeControls = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeControlsContext = createContext<ThemeControls | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function ThemeProvider({ children }: PropsWithChildren): JSX.Element {
  const systemScheme = useColorScheme();
  // Default to light theme (explicit user choice) instead of following system.
  const [mode, setMode] = useState<ThemeMode>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const savedMode = await getPreference(APP_THEME_MODE_KEY);
      if (!mounted) return;
      if (isThemeMode(savedMode)) {
        setMode(savedMode);
      }
      setHydrated(true);
    };

    void run();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void setPreference(APP_THEME_MODE_KEY, mode);
  }, [hydrated, mode]);

  const effectiveScheme: ColorSchemeName = mode === "system" ? systemScheme : mode;
  const theme = useMemo(() => createTheme(effectiveScheme), [effectiveScheme]);

  const controls = useMemo(() => {
    const toggle = () => {
      setMode((prev) => {
        if (prev === "system") {
          return systemScheme === "dark" ? "light" : "dark";
        }
        return prev === "dark" ? "light" : "dark";
      });
    };

    return { mode, setMode, toggle };
  }, [mode, systemScheme]);

  return (
    <ThemeControlsContext.Provider value={controls}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </ThemeControlsContext.Provider>
  );
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return theme;
}

export function useThemeControls(): ThemeControls {
  const controls = useContext(ThemeControlsContext);
  if (!controls) {
    throw new Error("useThemeControls must be used within ThemeProvider");
  }
  return controls;
}
