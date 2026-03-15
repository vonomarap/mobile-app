import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "../services/auth-context";
import {
  customerHasUnreadSupport,
  pickActiveSupportThread,
  subscribeSupportThreadsForCustomer,
  type SupportThread,
} from "../services/support-chat";
import { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeProvider";
import { spacing } from "../theme/tokens";

type RouteName = keyof RootStackParamList;

export function SupportChatFab(): JSX.Element | null {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [currentRoute, setCurrentRoute] = useState<RouteName | undefined>(() => {
    const name = (navigation as any).getCurrentRoute?.()?.name;
    return name as RouteName | undefined;
  });
  const [threads, setThreads] = useState<SupportThread[]>([]);

  useEffect(() => {
    if (!user?.uid) {
      setThreads([]);
      return;
    }
    return subscribeSupportThreadsForCustomer(user.uid, (nextThreads) => {
      setThreads(nextThreads);
    });
  }, [user?.uid]);

  useEffect(() => {
    const update = () => {
      const name = (navigation as any).getCurrentRoute?.()?.name;
      setCurrentRoute(name as RouteName | undefined);
    };

    update();
    const unsubscribe = (navigation as any).addListener?.("state", update);
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [navigation]);

  if (currentRoute === "SupportChat") return null;

  const hasUnread = customerHasUnreadSupport(pickActiveSupportThread(threads));

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
      <View
        pointerEvents="box-none"
        style={[
          styles.wrap,
          {
            right: spacing.md + insets.right,
            bottom: spacing.md + Math.max(insets.bottom, spacing.sm),
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("support.fabLabel")}
          onPress={() => (navigation as any).navigate("SupportChat")}
          style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
          <Text style={styles.label}>{t("support.fabLabel")}</Text>
          {hasUnread ? <View style={styles.badge} /> : null}
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    wrap: {
      position: "absolute",
      alignItems: "flex-end",
    },
    button: {
      minHeight: 52,
      paddingHorizontal: spacing.md,
      borderRadius: 999,
      backgroundColor: theme.colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      ...theme.shadow.md,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      ...( { outlineStyle: "none", outlineWidth: 0, cursor: "pointer" } as object ),
    },
    pressed: {
      opacity: 0.9,
    },
    label: {
      ...theme.typography.label,
      color: "#FFFFFF",
      fontSize: 14,
    },
    badge: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 10,
      height: 10,
      borderRadius: 999,
      backgroundColor: theme.colors.danger,
      borderWidth: 2,
      borderColor: "#FFFFFF",
    },
  });
}
