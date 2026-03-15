import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export function HelpIcon({
  onPress,
  accessibilityLabel = "Help"
}: {
  onPress: () => void;
  accessibilityLabel?: string;
}): JSX.Element {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={(state) => [
        styles.base,
        (state as unknown as { hovered?: boolean }).hovered ? styles.hovered : null,
        state.pressed ? styles.pressed : null
      ]}
    >
      <Ionicons name="help-circle-outline" size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: 2,
    borderRadius: 999,
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    ...( { cursor: "pointer" } as object )
  },
  hovered: {
    opacity: 0.9
  },
  pressed: {
    opacity: 0.75
  }
});

