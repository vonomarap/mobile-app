import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import type { CalcBreakdown } from "../utils/calc";
import { getCalcBreakdownGroupLabel, getCalcBreakdownItemLabel } from "../utils/calc-breakdown";
import { formatMoney } from "../utils/money";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";

export function PriceBreakdownList({
  breakdown,
  currency,
  style,
}: {
  breakdown?: CalcBreakdown | null;
  currency: string;
  style?: StyleProp<ViewStyle>;
}): JSX.Element | null {
  const { t } = useTranslation();
  const theme = useTheme();

  if (!breakdown?.groups?.length) return null;

  return (
    <View style={[styles.wrap, style]}>
      {breakdown.groups.map((group) => (
        <View
          key={group.key}
          style={[
            styles.group,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface2,
            },
          ]}
        >
          <View style={styles.groupHeader}>
            <Text style={[styles.groupTitle, { color: theme.colors.text }]}>
              {getCalcBreakdownGroupLabel(t, group.key)}
            </Text>
            <Text style={[styles.groupTotal, { color: theme.colors.text }]}>
              {formatMoney(group.total, currency)}
            </Text>
          </View>

          <View style={styles.items}>
            {group.items.map((item) => (
              <View key={`${group.key}:${item.key}:${item.title ?? ""}`} style={styles.itemRow}>
                <Text style={[styles.itemLabel, { color: theme.colors.textMuted }]}>
                  {getCalcBreakdownItemLabel(t, item)}
                </Text>
                <Text style={[styles.itemValue, { color: theme.colors.text }]}>
                  {formatMoney(item.total, currency)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  group: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  groupTitle: {
    ...font(700),
    fontSize: 13,
    flex: 1,
  },
  groupTotal: {
    ...font(700),
    fontSize: 13,
  },
  items: {
    gap: 6,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  itemLabel: {
    fontSize: 12,
    flex: 1,
  },
  itemValue: {
    fontSize: 12,
    ...font(700),
  },
});
