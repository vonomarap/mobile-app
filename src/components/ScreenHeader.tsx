import { ReactNode, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  rightSlot,
  align = "left"
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  rightSlot?: ReactNode;
  align?: "left" | "center";
}): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isCentered = align === "center";

  return (
    <View style={[styles.row, isCentered ? styles.rowCentered : null]}>
      <View style={[styles.left, isCentered ? styles.leftCentered : null]}>
        {eyebrow ? <Text style={[styles.eyebrow, isCentered ? styles.textCentered : null]}>{eyebrow.toUpperCase()}</Text> : null}
        <Text style={[styles.title, isCentered ? styles.textCentered : null]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, isCentered ? styles.textCentered : null]}>{subtitle}</Text> : null}
      </View>
      {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: spacing.md
    },
    rowCentered: {
      justifyContent: "center",
      alignItems: "center"
    },
    left: {
      flex: 1,
      gap: 4
    },
    leftCentered: {
      alignItems: "center"
    },
    right: {
      alignItems: "flex-end",
      justifyContent: "center"
    },
    textCentered: {
      textAlign: "center"
    },
    eyebrow: {
      ...font(800),
      fontSize: 12,
      lineHeight: 16,
      textTransform: "uppercase",
      color: theme.colors.primary
    },
    title: {
      ...theme.typography.h2,
      color: theme.colors.text
    },
    subtitle: {
      ...theme.typography.caption,
      color: theme.colors.textMuted
    }
  });
}
