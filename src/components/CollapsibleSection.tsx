import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "./Card";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

type Props = PropsWithChildren<{
  title: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (next: boolean) => void;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  density?: "default" | "compact";
}>;

export function CollapsibleSection({
  title,
  defaultExpanded = false,
  expanded: expandedProp,
  onExpandedChange,
  leftSlot,
  rightSlot,
  density = "default",
  children
}: Props): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isControlled = typeof expandedProp === "boolean";
  const initialExpanded = typeof expandedProp === "boolean" ? expandedProp : defaultExpanded;
  const [expandedState, setExpandedState] = useState(defaultExpanded);
  const expanded = isControlled ? expandedProp : expandedState;
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const progress = useRef(new Animated.Value(initialExpanded ? 1 : 0)).current;
  const isCompact = density === "compact";

  useEffect(() => {
    Animated.timing(progress, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();
  }, [expanded, progress]);

  const onMeasure = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0 && h !== measuredHeight) setMeasuredHeight(h);
  };

  const contentHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, measuredHeight || 0]
  });

  const contentOpacity = progress.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0, 0.2, 1]
  });

  const contentTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0]
  });

  const chevronRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"]
  });

  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => {
          const next = !expanded;
          if (isControlled) {
            onExpandedChange?.(next);
            return;
          }
          setExpandedState(next);
        }}
        style={(state) => {
          const pressed = state.pressed;
          const hovered = (state as unknown as { hovered?: boolean }).hovered;
          return [
            styles.header,
            isCompact ? styles.headerCompact : null,
            hovered ? styles.headerHovered : null,
            pressed ? styles.headerPressed : null,
          ];
        }}
      >
        <View style={styles.headerLeft}>
          {leftSlot ? <View style={styles.leftSlot}>{leftSlot}</View> : null}
          <Text style={[styles.title, isCompact ? styles.titleCompact : null]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
          <Animated.View style={{ transform: [{ rotateZ: chevronRotate }] }}>
            <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
          </Animated.View>
        </View>
      </Pressable>

      <Animated.View
        style={[
          styles.bodyClip,
          {
            height: contentHeight,
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }]
          }
        ]}
        pointerEvents={expanded ? "auto" : "none"}
      >
        <View style={[styles.measureWrap, isCompact ? styles.measureWrapCompact : null]} onLayout={onMeasure}>
          {children}
        </View>
      </Animated.View>
    </Card>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    card: {
      padding: 0,
      overflow: "hidden"
    },
    header: {
      minHeight: 56,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      borderWidth: 1,
      borderColor: "transparent",
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object )
    },
    headerCompact: {
      minHeight: 48,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      gap: spacing.sm,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      flex: 1,
      minWidth: 0
    },
    leftSlot: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft
    },
    headerHovered: {
      backgroundColor: theme.colors.surface2
    },
    headerPressed: {
      opacity: 0.92
    },
    title: {
      ...font(900),
      fontSize: 14,
      letterSpacing: 0.2,
      color: theme.colors.text,
      flex: 1
    },
    titleCompact: {
      fontSize: 13,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    rightSlot: {
      alignItems: "center",
      justifyContent: "center"
    },
    bodyClip: {
      overflow: "hidden"
    },
    measureWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      paddingTop: spacing.sm,
      gap: spacing.sm
    },
    measureWrapCompact: {
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.sm,
      paddingTop: spacing.xs,
    }
  });
}
