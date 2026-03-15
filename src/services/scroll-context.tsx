import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type NavGlassState = {
  isNavGlass: boolean;
  setScrollY: (y: number) => void;
  resetScroll: () => void;
};

const NAV_GLASS_THRESHOLD_PX = 16;

const NavGlassContext = createContext<NavGlassState | null>(null);

export function ScrollProvider({ children }: PropsWithChildren): JSX.Element {
  const [isNavGlass, setIsNavGlass] = useState(false);
  const lastIsNavGlass = useRef(false);

  const setScrollY = useCallback((y: number) => {
    const safeY = Number.isFinite(y) ? y : 0;
    const nextIsGlass = safeY > NAV_GLASS_THRESHOLD_PX;
    if (nextIsGlass === lastIsNavGlass.current) return;
    lastIsNavGlass.current = nextIsGlass;
    setIsNavGlass(nextIsGlass);
  }, []);

  const resetScroll = useCallback(() => {
    if (!lastIsNavGlass.current) return;
    lastIsNavGlass.current = false;
    setIsNavGlass(false);
  }, []);

  const value = useMemo<NavGlassState>(() => ({
    isNavGlass,
    setScrollY,
    resetScroll,
  }), [isNavGlass, resetScroll, setScrollY]);

  return <NavGlassContext.Provider value={value}>{children}</NavGlassContext.Provider>;
}

export function useNavGlass(): boolean {
  const ctx = useContext(NavGlassContext);
  if (!ctx) {
    throw new Error("useNavGlass must be used within ScrollProvider");
  }
  return ctx.isNavGlass;
}

export function useNavGlassControls(): Pick<NavGlassState, "setScrollY" | "resetScroll"> {
  const ctx = useContext(NavGlassContext);
  if (!ctx) {
    throw new Error("useNavGlassControls must be used within ScrollProvider");
  }
  return ctx;
}

