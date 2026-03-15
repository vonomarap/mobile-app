import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AppFlatList } from "../components/AppFlatList";
import { QuoteCard } from "../components/QuoteCard";
import { ScreenContainer } from "../components/ScreenContainer";
import { EmptyState } from "../components/EmptyState";
import { ScreenHeader } from "../components/ScreenHeader";
import { useAuth } from "../services/auth-context";
import { fetchQuotes } from "../services/quotes";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";

export function QuotesScreen(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["quotes", user?.uid],
    queryFn: () => fetchQuotes(user!.uid),
    enabled: Boolean(user)
  });

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void refetch();
    }, [refetch, user])
  );

  if (!user) {
    return (
      <ScreenContainer>
        <EmptyState
          icon={<Ionicons name="lock-closed-outline" size={22} color={theme.colors.primary} />}
          title={t("calculator.needAuth")}
          description={t("quotes.needAuthHint")}
        />
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.centerText, { color: theme.colors.textMuted }]}>{t("common.loading")}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <EmptyState
          icon={<Ionicons name="cloud-offline-outline" size={22} color={theme.colors.primary} />}
          title={t("common.error")}
          description={t("common.tryAgain")}
          actionTitle={t("common.retry")}
          onAction={() => void refetch()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppFlatList
        trackNavGlass
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader title={t("quotes.title")} subtitle={t("quotes.subtitle")} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.empty, { color: theme.colors.textMuted }]}>{t("quotes.empty")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <QuoteCard quote={item} onPress={() => navigation.navigate("QuoteDetails", { quoteId: item.id })} />
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    paddingBottom: 0
  },
  header: {
    marginBottom: spacing.md
  },
  emptyWrap: {
    paddingVertical: spacing.xl
  },
  empty: {
    textAlign: "center",
    fontSize: 14
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.sm
  },
  centerText: {
    fontSize: 14
  }
});
