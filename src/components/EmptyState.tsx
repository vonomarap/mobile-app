import { ReactNode, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { PrimaryButton } from "./PrimaryButton";

export function EmptyState({
  title,
  description,
  actionTitle,
  onAction,
  icon
}: {
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  icon?: ReactNode;
}): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.root}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionTitle && onAction ? (
        <View style={styles.action}>
          <PrimaryButton title={actionTitle} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    root: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      gap: spacing.sm
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.xs
    },
    title: {
      ...theme.typography.h3,
      color: theme.colors.text,
      textAlign: "center"
    },
    description: {
      ...theme.typography.bodyRegular,
      color: theme.colors.textMuted,
      textAlign: "center",
      maxWidth: 520
    },
    action: {
      marginTop: spacing.sm,
      width: "100%",
      maxWidth: 360
    }
  });
}

