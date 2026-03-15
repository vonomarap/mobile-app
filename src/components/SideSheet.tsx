import type { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { useReduceMotion } from "../hooks/useReduceMotion";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

type Variant = "right" | "bottom";

export function SideSheet({
  open,
  title,
  onClose,
  variant = "bottom",
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  variant?: Variant;
  children: ReactNode;
}): JSX.Element | null {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [mounted, setMounted] = useState(open);
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    if (open) setMounted(true);

    progress.stopAnimation();
    if (reduceMotion) {
      progress.setValue(open ? 1 : 0);
      if (!open) setMounted(false);
      return;
    }

    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: open ? 210 : 160,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      if (!open) setMounted(false);
    });
  }, [open, progress, reduceMotion]);

  const sheetWidth = useMemo(() => {
    // Comfortable on desktop, but not too narrow on mid-width screens.
    const guess = Math.round(screenWidth * 0.42);
    return Math.min(520, Math.max(340, guess));
  }, [screenWidth]);

  const maxBottomHeight = useMemo(() => {
    return Math.round(screenHeight * 0.86);
  }, [screenHeight]);

  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [variant === "right" ? sheetWidth + 24 : maxBottomHeight + 24, 0]
  });

  if (!mounted) return null;

  const radius = 18;
  const sheetRadii =
    variant === "right"
      ? { borderTopLeftRadius: radius, borderBottomLeftRadius: radius }
      : { borderTopLeftRadius: radius, borderTopRightRadius: radius };

  return (
    <Modal transparent animationType="none" visible={mounted} onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              backgroundColor: theme.isDark ? "rgba(0,0,0,0.64)" : "rgba(0,0,0,0.40)",
              opacity: backdropOpacity
            }
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={StyleSheet.absoluteFillObject}
            onPress={onClose}
          />
        </Animated.View>

        <View pointerEvents="box-none" style={styles.layer}>
          <Animated.View
            style={[
              styles.sheet,
              sheetRadii,
              variant === "right"
                ? {
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: sheetWidth,
                    transform: [{ translateX: translate }],
                  }
                : {
                    left: 0,
                    right: 0,
                    bottom: 0,
                    maxHeight: maxBottomHeight,
                    transform: [{ translateY: translate }],
                  },
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              theme.shadow.lg
            ]}
          >
            {variant === "bottom" ? (
              <View style={styles.handleWrap} pointerEvents="none">
                <View
                  style={[
                    styles.handle,
                    { backgroundColor: theme.isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.12)" }
                  ]}
                />
              </View>
            ) : null}

            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={(state) => [styles.closeButton, state.pressed ? { opacity: 0.75 } : null]}
              >
                <Ionicons name="close" size={18} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  layer: {
    flex: 1
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject
  },
  sheet: {
    position: "absolute",
    borderWidth: 1,
    overflow: "hidden"
  },
  handleWrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    alignItems: "center"
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm
  },
  title: {
    ...font(900),
    fontSize: 16,
    flex: 1
  },
  closeButton: {
    padding: 8,
    borderRadius: 999,
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    ...( { cursor: "pointer" } as object )
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md
  }
});

