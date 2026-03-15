import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "./Card";
import { PrimaryButton } from "./PrimaryButton";

export function QuoteSuccessModal({
  open,
  title,
  body,
  quoteId,
  closeLabel,
  quotesLabel,
  onClose,
  onViewQuotes
}: {
  open: boolean;
  title: string;
  body: string;
  quoteId: string | null;
  closeLabel: string;
  quotesLabel: string;
  onClose: () => void;
  onViewQuotes: () => void;
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
          <Card style={styles.card} elevated>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.primarySoft }]}>
              <Ionicons name="checkmark" size={22} color={theme.colors.primary} />
            </View>

            <View style={styles.textBlock}>
              <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
              <Text style={[styles.body, { color: theme.colors.textMuted }]}>{body}</Text>
              {quoteId ? (
                <Text style={[styles.idText, { color: theme.colors.textMuted }]}>
                  #{quoteId}
                </Text>
              ) : null}
            </View>

            <View style={styles.actions}>
              <PrimaryButton title={quotesLabel} onPress={onViewQuotes} />
              <PrimaryButton tone="soft" title={closeLabel} onPress={onClose} />
            </View>
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
    gap: spacing.md,
    alignItems: "center"
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  textBlock: {
    gap: spacing.xs,
    alignItems: "center"
  },
  title: {
    ...font(900),
    fontSize: 16,
    textAlign: "center"
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  },
  idText: {
    marginTop: 2,
    ...font(700),
    fontSize: 12,
    letterSpacing: 0.2
  },
  actions: {
    width: "100%",
    gap: spacing.sm
  }
});
