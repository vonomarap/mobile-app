import { ReactNode, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

export function ScreenHeader({
  title,
  subtitle,
  rightSlot,
  align = "left"
}: {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  align?: "left" | "center";
}): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isCentered = align === "center";

  return (
    <View style={[styles.row, isCentered ? styles.rowCentered : null]}>
      <View style={[styles.left, isCentered ? styles.leftCentered : null]}>
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
