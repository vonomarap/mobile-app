import { Ionicons } from "@expo/vector-icons";
import { type ComponentProps, useMemo } from "react";
import { Pressable, StyleProp, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from "react-native";
import { font } from "../theme/font";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export type SectionTabItem<T extends string> = {
  key: T;
  label: string;
  icon?: IoniconName;
};

export function SectionTabs<T extends string>({
  items,
  value,
  onValueChange,
  style,
  desktopSingleRow = false,
}: {
  items: SectionTabItem<T>[];
  value: T;
  onValueChange: (next: T) => void;
  style?: StyleProp<ViewStyle>;
  desktopSingleRow?: boolean;
}): JSX.Element {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isDesktopSingleRow = desktopSingleRow && screenWidth >= theme.layout.desktopNavMinWidth;

  return (
    <View style={[styles.wrap, isDesktopSingleRow ? styles.wrapDesktopSingleRow : null, style]} accessibilityRole="tablist">
      {items.map((item) => {
        const selected = item.key === value;
        const showIcon = Boolean(item.icon) && !isDesktopSingleRow;

        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onValueChange(item.key)}
            style={(state) => {
              const pressed = state.pressed;
              const hovered = (state as unknown as { hovered?: boolean }).hovered;

              return [
                styles.item,
                isDesktopSingleRow ? styles.itemDesktopSingleRow : null,
                selected ? styles.itemSelected : null,
                hovered && !selected ? styles.itemHovered : null,
                pressed ? styles.itemPressed : null,
              ];
            }}
          >
            <View style={[styles.itemContent, isDesktopSingleRow ? styles.itemContentDesktopSingleRow : null]}>
              {showIcon ? <Ionicons name={item.icon} size={16} color={selected ? theme.colors.primary : theme.colors.textMuted} /> : null}
              <Text
                style={[styles.label, isDesktopSingleRow ? styles.labelDesktopSingleRow : null, selected ? styles.labelSelected : null]}
                numberOfLines={isDesktopSingleRow ? 1 : 2}
              >
                {item.label}
              </Text>
            </View>
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
      flexWrap: "wrap",
      gap: spacing.xs,
      padding: spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radius.md,
      backgroundColor: theme.colors.surface2,
    },
    wrapDesktopSingleRow: {
      flexWrap: "nowrap",
      gap: 4,
      padding: 4,
    },
    item: {
      minHeight: 44,
      minWidth: 120,
      flexGrow: 1,
      flexBasis: 0,
      borderWidth: 1,
      borderColor: "transparent",
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      backgroundColor: theme.colors.surface2,
      justifyContent: "center",
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object ),
    },
    itemDesktopSingleRow: {
      minWidth: 0,
      minHeight: 38,
      flexShrink: 1,
      paddingHorizontal: 6,
      paddingVertical: 6,
    },
    itemContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      minWidth: 0,
    },
    itemContentDesktopSingleRow: {
      gap: 0,
    },
    itemSelected: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      ...(theme.shadow.sm as object),
    },
    itemHovered: {
      backgroundColor: theme.colors.surface,
    },
    itemPressed: {
      opacity: 0.9,
    },
    label: {
      ...font(800),
      flexShrink: 1,
      fontSize: 12,
      lineHeight: 16,
      textAlign: "center",
      color: theme.colors.textMuted,
    },
    labelDesktopSingleRow: {
      fontSize: 11,
      lineHeight: 13,
    },
    labelSelected: {
      color: theme.colors.text,
    },
  });
}
