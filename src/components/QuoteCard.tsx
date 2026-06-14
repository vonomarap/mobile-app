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

  const pill = getPillColors(theme.isDark, tone);
  const isPreliminaryQuote = statusCode === "NEW" || statusCode === "IN_REVIEW";

  const content = (
    <Card variant="solid" style={styles.card}>
      <Text
        style={[
          styles.status,
          {
            color: pill.text,
            backgroundColor: pill.bg,
            borderColor: pill.border,
            borderWidth: 1
          }
        ]}
      >
        {statusLabel}
      </Text>
      <Text style={[styles.title, { color: theme.colors.text }]}>#{quote.id}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
        <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{createdAt}</Text>
      </View>
      <View style={styles.priceRow}>
        <Ionicons name="cash-outline" size={14} color={theme.colors.text} />
        <Text style={[styles.price, { color: theme.colors.text }]}>
          {formatMoney(quote.totalPrice ?? 0, quote.currency ?? currency)}
        </Text>
      </View>
      {isPreliminaryQuote ? (
        <Text style={[styles.priceNote, { color: theme.colors.textMuted }]}>
          {t("quotes.details.preliminaryShort")}
        </Text>
      ) : null}
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    ...font(700),
    fontSize: 11
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
    fontSize: 15,
  },
  priceNote: {
    fontSize: 12,
  },
});

function getPillColors(
  isDark: boolean,
  tone: "primary" | "success" | "warning" | "danger"
): { bg: string; text: string; border: string } {
  if (tone === "success") {
    return {
      bg: isDark ? "rgba(16, 185, 129, 0.12)" : "rgba(16, 185, 129, 0.08)",
      text: isDark ? "#34d399" : "#059669",
      border: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.15)"
    };
  }
  if (tone === "warning") {
    return {
      bg: isDark ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.08)",
      text: isDark ? "#fbbf24" : "#d97706",
      border: isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.15)"
    };
  }
  if (tone === "danger") {
    return {
      bg: isDark ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.08)",
      text: isDark ? "#f87171" : "#dc2626",
      border: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.15)"
    };
  }
  return {
    bg: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
    text: isDark ? "#e4e4e7" : "#3f3f46",
    border: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.06)"
  };
}
