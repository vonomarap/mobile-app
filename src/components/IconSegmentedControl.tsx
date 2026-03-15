import { Ionicons } from "@expo/vector-icons";
import { useMemo, type ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { radius } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export type IconSegmentOption<T extends string> = {
  label: string;
  value: T;
  icon: IoniconName;
};

export function IconSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  iconSize = 14
}: {
  value: T;
  options: IconSegmentOption<T>[];
  onChange: (next: T) => void;
  iconSize?: number;
}): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {Platform.OS !== "web" ? (
        <View pointerEvents="none" style={styles.glassBg}>
          <BlurView
            tint={theme.isDark ? "dark" : "light"}
            intensity={18}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: theme.isDark ? "rgba(22,22,23,0.16)" : "rgba(255,255,255,0.16)" }
            ]}
          />
        </View>
      ) : null}
      {options.map((opt) => {
        const selected = opt.value === value;

        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.value)}
            hitSlop={8}
            style={(state) => {
              const pressed = state.pressed;
              const hovered = (state as unknown as { hovered?: boolean }).hovered;

              return [
                styles.item,
                selected ? styles.itemSelected : null,
                hovered && !selected ? styles.itemHovered : null,
                pressed ? styles.itemPressed : null,
              ];
            }}
          >
            <Ionicons
              name={opt.icon}
              size={iconSize}
              color={selected ? theme.colors.primary : theme.colors.textMuted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: theme.isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
      borderRadius: radius.md,
      padding: 3,
      backgroundColor: theme.isDark ? "rgba(22,22,23,0.40)" : "rgba(255,255,255,0.52)",
      gap: 3,
      alignSelf: "flex-start",
      overflow: "hidden",
      ...(Platform.OS === "web"
        ? ({
            backdropFilter: "blur(12px) saturate(120%)",
            WebkitBackdropFilter: "blur(12px) saturate(120%)"
          } as object)
        : null)
    },
    glassBg: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radius.md,
      overflow: "hidden"
    },
    item: {
      width: 32,
      minHeight: 28,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.sm,
      paddingHorizontal: 0,
      borderWidth: 1,
      borderColor: "transparent",
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object )
    },
    itemSelected: {
      backgroundColor: theme.isDark ? "rgba(255,255,255,0.10)" : theme.colors.primarySoft,
      borderColor: theme.colors.primary
    },
    itemHovered: {
      backgroundColor: theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.72)"
    },
    itemPressed: {
      opacity: 0.9
    }
  });
}
