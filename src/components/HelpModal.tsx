import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "./Card";
import { PrimaryButton } from "./PrimaryButton";

export function HelpModal({
  open,
  title,
  body,
  closeLabel,
  onClose
}: {
  open: boolean;
  title: string;
  body: string;
  closeLabel: string;
  onClose: () => void;
}): JSX.Element {
  const theme = useTheme();

  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={[
            styles.backdrop,
            { backgroundColor: theme.isDark ? "rgba(0,0,0,0.60)" : "rgba(0,0,0,0.40)" }
          ]}
          onPress={onClose}
        />

        <View style={styles.center} pointerEvents="box-none">
          <Card style={[styles.card, { borderColor: theme.colors.border }]} elevated>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={(state) => [
                  styles.closeButton,
                  state.pressed ? { opacity: 0.75 } : null
                ]}
              >
                <Ionicons name="close" size={18} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
              <Text style={[styles.body, { color: theme.colors.textMuted }]}>{body}</Text>
            </ScrollView>

            <PrimaryButton tone="soft" title={closeLabel} onPress={onClose} />
          </Card>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg
  },
  card: {
    width: "100%",
    maxWidth: 520,
    gap: spacing.sm
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  title: {
    ...font(900),
    fontSize: 16,
    flex: 1
  },
  closeButton: {
    padding: 6,
    borderRadius: 999,
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    ...( { cursor: "pointer" } as object )
  },
  bodyScroll: {
    maxHeight: 260
  },
  bodyContent: {
    paddingBottom: spacing.xs
  },
  body: {
    fontSize: 14,
    lineHeight: 20
  }
});
