import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (!mounted) return;
        setReduceMotion(Boolean(value));
      })
      .catch(() => undefined);

    const sub = (AccessibilityInfo as any).addEventListener?.("reduceMotionChanged", (value: boolean) => {
      setReduceMotion(Boolean(value));
    });

    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduceMotion;
}
