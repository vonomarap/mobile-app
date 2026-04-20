import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ActivityIndicator, Image, Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppScrollView } from "../components/AppScrollView";
import { Card } from "../components/Card";
import { MAX_CONTACT_ICON } from "../constants/contactAssets";
import { EmptyState } from "../components/EmptyState";
import { ScreenContainer } from "../components/ScreenContainer";
import { ScreenHeader } from "../components/ScreenHeader";
import { fetchSiteSettings } from "../services/site-settings";
import { font } from "../theme/font";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { buildExternalUrl, buildMailtoUrl, buildPhoneUrl, buildTelegramUrl, buildWhatsAppUrl, formatTelegramValue } from "../utils/contact-links";

const SUPPORT_TELEGRAM_USERNAME = "kanokna_support_bot";
const SUPPORT_TELEGRAM_FALLBACK = `${SUPPORT_TELEGRAM_USERNAME}?start=site`;

type ContactAction = {
  key: string;
  title: string;
  value: string;
  renderIcon: (active: boolean) => JSX.Element;
  onPress: () => void;
};

function openExternalUrl(url: string): void {
  if (!url) return;

  if (Platform.OS === "web") {
    const win = (globalThis as any).window as
      | { open?: (url: string, target?: string, features?: string) => void; location?: { href?: string } }
      | undefined;
    if (/^(mailto:|tel:)/i.test(url) && win?.location) {
      win.location.href = url;
      return;
    }
    if (win?.open) {
      win.open(url, "_blank", "noopener,noreferrer");
      return;
    }
  }

  void Linking.openURL(url).catch(() => undefined);
}

function isContactButtonActive(state: { pressed: boolean; hovered?: boolean }): boolean {
  return Boolean(state.pressed || (Platform.OS === "web" && state.hovered));
}

function getMaxIconStyle(active: boolean, size: number, mutedColor: string): object[] {
  return [
    { width: size, height: size },
    active
      ? { opacity: 1 }
      : Platform.OS === "web"
        ? ({ filter: "grayscale(1)", opacity: 0.72 } as object)
        : { tintColor: mutedColor, opacity: 0.78 },
  ];
}

export function ContactsScreen(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = isWeb && width >= theme.layout.desktopNavMinWidth;
  const gutter = width < 420 ? spacing.sm : spacing.md;
  const tileWidth = width >= 720 ? 88 : 72;

  const settingsQuery = useQuery({
    queryKey: ["app_settings", "site"],
    queryFn: fetchSiteSettings,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const settings = settingsQuery.data ?? {};
  const styles = useMemo(() => makeStyles(theme, isDesktopWeb), [theme, isDesktopWeb]);

  const phoneRaw = (settings.phone ?? "").trim();
  const phoneUrl = phoneRaw ? buildPhoneUrl(phoneRaw) : "";
  const emailRaw = (settings.email ?? "").trim();
  const emailUrl = emailRaw ? buildMailtoUrl(emailRaw) : "";
  const whatsappRaw = (settings.whatsapp ?? "").trim();
  const whatsappUrl = whatsappRaw ? buildWhatsAppUrl(whatsappRaw) : "";
  const telegramSource = (settings.telegram ?? "").trim();
  const telegramLinkSource = telegramSource || SUPPORT_TELEGRAM_FALLBACK;
  const telegramRaw = telegramSource ? formatTelegramValue(telegramSource) : `@${SUPPORT_TELEGRAM_USERNAME}`;
  const telegramUrl = buildTelegramUrl(telegramLinkSource);
  const maxRaw = (settings.maxUrl ?? "").trim();
  const maxUrl = maxRaw ? buildExternalUrl(maxRaw) : "";
  const mutedIconColor = theme.colors.textMuted;

  const directContacts = [
    phoneUrl
      ? {
          key: "phone",
          title: t("contacts.phone"),
          value: phoneRaw,
          renderIcon: (active: boolean) => (
            <FontAwesome name="phone" size={16} color={active ? theme.colors.primary : mutedIconColor} />
          ),
          onPress: () => openExternalUrl(phoneUrl),
        }
      : null,
    emailUrl
      ? {
          key: "email",
          title: t("contacts.email"),
          value: emailRaw,
          renderIcon: (active: boolean) => (
            <FontAwesome name="envelope-o" size={16} color={active ? theme.colors.primary : mutedIconColor} />
          ),
          onPress: () => openExternalUrl(emailUrl),
        }
      : null,
  ].filter((item): item is ContactAction => Boolean(item));

  const messengerContacts = [
    whatsappUrl
      ? {
          key: "whatsapp",
          title: t("contacts.whatsapp"),
          value: whatsappRaw,
          renderIcon: (active: boolean) => <FontAwesome name="whatsapp" size={18} color={active ? "#25D366" : mutedIconColor} />,
          onPress: () => openExternalUrl(whatsappUrl),
        }
      : null,
    telegramUrl
      ? {
          key: "telegram",
          title: t("contacts.telegram"),
          value: telegramRaw,
          renderIcon: (active: boolean) => <FontAwesome name="telegram" size={18} color={active ? "#2AABEE" : mutedIconColor} />,
          onPress: () => openExternalUrl(telegramUrl),
        }
      : null,
    maxUrl
      ? {
          key: "max",
          title: t("contacts.max"),
          value: maxRaw,
          renderIcon: (active: boolean) => (
            <Image
              source={MAX_CONTACT_ICON}
              style={getMaxIconStyle(active, 20, mutedIconColor)}
              resizeMode="contain"
            />
          ),
          onPress: () => openExternalUrl(maxUrl),
        }
      : null,
  ].filter((item): item is ContactAction => Boolean(item));

  const hasContacts = Boolean(directContacts.length || messengerContacts.length);

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
            {directContacts.length ? (
              <Card style={styles.card}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>{t("footer.contactTitle")}</Text>

                <View style={styles.buttonGrid}>
                  {directContacts.map((item) => (
                    <Pressable
                      key={item.key}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.title}: ${item.value}`}
                      onPress={item.onPress}
                      style={[styles.buttonPressable, { width: tileWidth }]}
                    >
                      {(state) => {
                        const active = isContactButtonActive(state as { pressed: boolean; hovered?: boolean });
                        return (
                          <View
                            style={[
                              styles.contactButton,
                              {
                                borderColor: active ? theme.colors.primary : theme.colors.border,
                                backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface2,
                              },
                              state.pressed ? styles.rowPressed : null
                            ]}
                          >
                            <View
                              style={[
                                styles.contactButtonIcon,
                                {
                                  backgroundColor: theme.colors.surface,
                                  borderColor: active ? theme.colors.primary : theme.colors.border,
                                },
                              ]}
                            >
                              {item.renderIcon(active)}
                            </View>
                          </View>
                        );
                      }}
                    </Pressable>
                  ))}
                </View>
              </Card>
            ) : null}

            {messengerContacts.length ? (
              <Card style={styles.card}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>{t("contacts.messengers")}</Text>

                <View style={styles.buttonGrid}>
                  {messengerContacts.map((item) => (
                    <Pressable
                      key={item.key}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.title}: ${item.value}`}
                      onPress={item.onPress}
                      style={[styles.buttonPressable, { width: tileWidth }]}
                    >
                      {(state) => {
                        const active = isContactButtonActive(state as { pressed: boolean; hovered?: boolean });
                        return (
                          <View
                            style={[
                              styles.contactButton,
                              {
                                borderColor: active ? theme.colors.primary : theme.colors.border,
                                backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface2,
                              },
                              state.pressed ? styles.rowPressed : null
                            ]}
                          >
                            <View
                              style={[
                                styles.contactButtonIcon,
                                {
                                  backgroundColor: theme.colors.surface,
                                  borderColor: active ? theme.colors.primary : theme.colors.border,
                                },
                              ]}
                            >
                              {item.renderIcon(active)}
                            </View>
                          </View>
                        );
                      }}
                    </Pressable>
                  ))}
                </View>
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
    buttonGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    buttonPressable: {
      minWidth: 0,
    },
    sectionTitle: {
      ...font(800),
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    contactButton: {
      borderWidth: 1,
      borderRadius: radius.md,
      minHeight: 72,
      alignItems: "center",
      justifyContent: "center",
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
    },
    rowPressed: {
      opacity: 0.9,
    },
    contactButtonIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
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
