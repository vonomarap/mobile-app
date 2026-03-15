import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";

export function ScreenContainer({ children }: PropsWithChildren): JSX.Element {
  const theme = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);
  const enter = useRef(new Animated.Value(Platform.OS === "web" ? 0 : 1)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (mounted) setReduceMotion(Boolean(v));
      })
      .catch(() => undefined);

    const sub = (AccessibilityInfo as any).addEventListener?.("reduceMotionChanged", (v: boolean) => {
      setReduceMotion(Boolean(v));
    });

    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    enter.stopAnimation();
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [enter, reduceMotion]);

  // On mobile web, SafeAreaView can add an extra bottom inset that looks like a "strip".
  // We keep safe areas for native apps, but remove the bottom inset on web.
  const edges = Platform.OS === "web" ? (["top", "left", "right"] as const) : (["top", "bottom", "left", "right"] as const);

  const enterStyle =
    Platform.OS === "web"
      ? {
          opacity: enter,
          transform: [
            {
              translateY: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0]
              })
            }
          ]
        }
      : null;

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}>
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <View style={[styles.inner, { maxWidth: theme.layout.maxWidth }]}>
          {Platform.OS === "web" ? (
            <Animated.View style={[styles.enterWrap, enterStyle as any]}>{children}</Animated.View>
          ) : (
            children
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center"
  },
  inner: {
    flex: 1,
    width: "100%"
  },
  enterWrap: {
    flex: 1
  }
});
