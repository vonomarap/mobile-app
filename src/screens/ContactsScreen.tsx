import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppScrollView } from "../components/AppScrollView";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ScreenContainer } from "../components/ScreenContainer";
import { ScreenHeader } from "../components/ScreenHeader";
import { fetchSiteSettings } from "../services/site-settings";
import { font } from "../theme/font";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

const SUPPORT_TELEGRAM_USERNAME = "kanokna_support_bot";
const SUPPORT_TELEGRAM_URL = `https://t.me/${SUPPORT_TELEGRAM_USERNAME}?start=site`;

function buildWhatsAppUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const digits = raw.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

function openExternalUrl(url: string): void {
  if (!url) return;

  if (Platform.OS === "web") {
    const win = (globalThis as any).window as { open?: (url: string, target?: string, features?: string) => void } | undefined;
    if (win?.open) {
      win.open(url, "_blank", "noopener,noreferrer");
      return;
    }
  }

  void Linking.openURL(url).catch(() => undefined);
}

export function ContactsScreen(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = isWeb && width >= theme.layout.desktopNavMinWidth;
  const gutter = width < 420 ? spacing.sm : spacing.md;

  const settingsQuery = useQuery({
    queryKey: ["app_settings", "site"],
    queryFn: fetchSiteSettings,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const settings = settingsQuery.data ?? {};

  const whatsappRaw = (settings.whatsapp ?? "").trim();

  const whatsappUrl = whatsappRaw ? buildWhatsAppUrl(whatsappRaw) : "";
  const telegramRaw = `@${SUPPORT_TELEGRAM_USERNAME}`;
  const telegramUrl = SUPPORT_TELEGRAM_URL;

  const hasContacts = Boolean(whatsappUrl || telegramUrl);

  const webWrapText = isWeb
    ? ({ wordBreak: "break-word", overflowWrap: "anywhere", whiteSpace: "normal" } as object)
    : null;

  const styles = useMemo(() => makeStyles(theme, isDesktopWeb), [theme, isDesktopWeb]);

  if (settingsQuery.isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.centerText, { color: theme.colors.textMuted }]}>{t("common.loading")}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (settingsQuery.isError) {
    return (
      <ScreenContainer>
        <EmptyState
          icon={<Ionicons name="cloud-offline-outline" size={22} color={theme.colors.primary} />}
          title={t("common.error")}
          description={t("common.tryAgain")}
          actionTitle={t("common.retry")}
          onAction={() => void settingsQuery.refetch()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppScrollView trackNavGlass showsVerticalScrollIndicator={false} contentContainerStyle={[styles.container, { padding: gutter }]}>
        <View style={styles.headerWrap}>
          <ScreenHeader
            title={t("contacts.title", { defaultValue: t("footer.contactTitle") })}
            subtitle={t("contacts.subtitle")}
            align={isDesktopWeb ? "center" : "left"}
          />
        </View>

        {hasContacts ? (
          <>
            {whatsappUrl || telegramUrl ? (
              <Card style={styles.card}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>{t("contacts.messengers")}</Text>

                {whatsappUrl ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openExternalUrl(whatsappUrl)}
                    style={(state) => [
                      styles.row,
                      { borderColor: theme.colors.border, backgroundColor: theme.colors.primarySoft },
                      state.pressed ? styles.rowPressed : null
                    ]}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: theme.colors.surface }]}>
                      <FontAwesome name="whatsapp" size={18} color="#25D366" />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={[styles.rowTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {t("contacts.whatsapp")}
                      </Text>
                      <Text style={[styles.rowValue, { color: theme.colors.textMuted }, webWrapText]} numberOfLines={1}>
                        {whatsappRaw}
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={18} color={theme.colors.textMuted} />
                  </Pressable>
                ) : null}

                {telegramUrl ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openExternalUrl(telegramUrl)}
                    style={(state) => [
                      styles.row,
                      { borderColor: theme.colors.border, backgroundColor: theme.colors.primarySoft },
                      state.pressed ? styles.rowPressed : null
                    ]}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: theme.colors.surface }]}>
                      <FontAwesome name="telegram" size={18} color="#2AABEE" />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={[styles.rowTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {t("contacts.telegram")}
                      </Text>
                      <Text style={[styles.rowValue, { color: theme.colors.textMuted }, webWrapText]} numberOfLines={1}>
                        {telegramRaw}
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={18} color={theme.colors.textMuted} />
                  </Pressable>
                ) : null}
              </Card>
            ) : null}
          </>
        ) : (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon={<Ionicons name="chatbubbles-outline" size={22} color={theme.colors.primary} />}
              title={t("contacts.emptyTitle")}
              description={t("contacts.emptyDescription")}
            />
          </View>
        )}
      </AppScrollView>
    </ScreenContainer>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>, isDesktopWeb: boolean): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingBottom: 0,
      gap: spacing.md,
      ...(isDesktopWeb
        ? ({
            width: "100%",
            maxWidth: 760,
            alignSelf: "center",
          } as object)
        : null),
    },
    headerWrap: {
      ...(isDesktopWeb ? ({ alignItems: "center" } as object) : null),
      marginBottom: spacing.sm,
    },
    card: {
      gap: spacing.sm,
    },
    sectionTitle: {
      ...font(800),
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 12,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
    },
    rowPressed: {
      opacity: 0.9,
    },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    rowTitle: {
      ...font(900),
      fontSize: 14,
      lineHeight: 18,
    },
    rowValue: {
      fontSize: 12,
      lineHeight: 16,
    },
    emptyWrap: {
      flexGrow: 1,
      justifyContent: "center",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      gap: spacing.sm,
    },
    centerText: {
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
