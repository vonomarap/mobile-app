import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Quote } from "../services/quotes";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "./Card";
import { formatMoney } from "../utils/money";
import { useCurrency } from "../services/currency-context";

export function QuoteCard({ quote, onPress }: { quote: Quote; onPress?: () => void }): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const currency = useCurrency();
  const createdAt = quote.createdAt?.seconds ? new Date(quote.createdAt.seconds * 1000).toLocaleDateString() : "-";
  const statusCode = String(quote.status || "").trim().toUpperCase();
  const statusLabel = statusCode
    ? t(`quotes.statuses.${statusCode}`, { defaultValue: statusCode })
    : "-";

  const tone =
    statusCode === "CANCELLED"
      ? "danger"
      : statusCode === "CONFIRMED"
      ? "success"
      : statusCode === "IN_REVIEW" || statusCode === "OFFER_SENT"
      ? "warning"
      : "primary";

  const pill = getPillColors(theme.isDark, tone, theme.colors);

  const content = (
    <Card style={styles.card}>
      <Text style={[styles.status, { color: pill.text, backgroundColor: pill.bg }]}>{statusLabel}</Text>
      <Text style={[styles.title, { color: theme.colors.text }]}>#{quote.id}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
        <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{createdAt}</Text>
      </View>
      <View style={styles.priceRow}>
        <Ionicons name="cash-outline" size={16} color={theme.colors.primary} />
        <Text style={[styles.price, { color: theme.colors.primary }]}>
          {formatMoney(quote.totalPrice ?? 0, quote.currency ?? currency)}
        </Text>
      </View>
    </Card>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={(state) => [
        styles.pressable,
        state.pressed ? styles.pressed : null
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 16,
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    ...( { cursor: "pointer" } as object )
  },
  pressed: {
    opacity: 0.92
  },
  card: {
    gap: spacing.xs
  },
  status: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 99,
    ...font(700),
    fontSize: 12
  },
  title: {
    ...font(700),
    fontSize: 14,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  meta: {
    fontSize: 12
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  price: {
    ...font(700),
    fontSize: 16,
  }
});

function getPillColors(
  isDark: boolean,
  tone: "primary" | "success" | "warning" | "danger",
  colors: { primary: string; success: string; warning: string; danger: string; primarySoft: string }
): { bg: string; text: string } {
  if (tone === "success") {
    return { bg: isDark ? "#063A2B" : "#E3F5ED", text: colors.success };
  }
  if (tone === "warning") {
    return { bg: isDark ? "#3A2A06" : "#FFF3D6", text: colors.warning };
  }
  if (tone === "danger") {
    return { bg: isDark ? "#3A0D12" : "#FBE5E5", text: colors.danger };
  }
  return { bg: colors.primarySoft, text: colors.primary };
}
