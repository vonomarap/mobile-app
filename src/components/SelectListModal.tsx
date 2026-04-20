import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useMemo } from "react";
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

export type SelectListOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  leftSlot?: ReactNode;
};

type Props<T extends string> = {
  mounted: boolean;
  open: boolean;
  onClose: () => void;
  options: SelectListOption<T>[];
  value?: T | null;
  onSelect: (next: T) => void;
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  animatedStyle?: object;
  showVerticalScrollIndicator?: boolean;
};

export function SelectListModal<T extends string>({
  mounted,
  open,
  onClose,
  options,
  value,
  onSelect,
  top,
  left,
  width,
  maxHeight,
  animatedStyle,
  showVerticalScrollIndicator = false,
}: Props<T>): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Modal transparent animationType="none" visible={mounted} onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          pointerEvents={open ? "auto" : "none"}
          style={[
            styles.overlay,
            theme.shadow.md,
            animatedStyle,
            {
              top,
              left,
              width,
              maxHeight,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={showVerticalScrollIndicator}
          >
            {options.map((item) => {
              const selected = item.value === value;
              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onSelect(item.value)}
                  style={(state) => [
                    styles.option,
                    selected ? styles.optionSelected : null,
                    (state as unknown as { hovered?: boolean }).hovered && !selected ? styles.optionHovered : null,
                    state.pressed ? styles.optionPressed : null,
                  ]}
                >
                  <View style={styles.optionIndicator}>
                    {selected ? <Ionicons name="checkmark" size={16} color={theme.colors.primary} /> : null}
                  </View>
                  <View style={styles.optionMain}>
                    {item.leftSlot ? <View style={styles.optionSlot}>{item.leftSlot}</View> : null}
                    <View style={styles.optionTextWrap}>
                      <Text
                        style={[styles.optionLabel, selected ? styles.optionLabelSelected : null]}
                        numberOfLines={item.description ? 2 : 1}
                      >
                        {item.label}
                      </Text>
                      {item.description ? (
                        <Text style={styles.optionDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    overlay: {
      position: "absolute",
      zIndex: 70,
      elevation: 40,
      borderWidth: 1,
      borderRadius: 8,
      padding: 6,
      overflow: "hidden",
    },
    scroll: {
      maxHeight: 360,
    },
    scrollContent: {
      gap: 4,
    },
    option: {
      minHeight: 46,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: "transparent",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object ),
    },
    optionSelected: {
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.primary,
    },
    optionHovered: {
      backgroundColor: theme.colors.surface2,
    },
    optionPressed: {
      opacity: 0.96,
      backgroundColor: theme.colors.surface2,
    },
    optionIndicator: {
      width: 16,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    optionMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    optionSlot: {
      minWidth: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 1,
    },
    optionTextWrap: {
      flex: 1,
      gap: 1,
    },
    optionLabel: {
      ...theme.typography.bodyRegular,
      color: theme.colors.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "500",
    },
    optionLabelSelected: {
      fontWeight: "600",
    },
    optionDescription: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      lineHeight: 16,
    },
  });
}
