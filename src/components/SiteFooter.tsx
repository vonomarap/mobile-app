import { FontAwesome } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { fetchSiteSettings } from "../services/site-settings";
import { font } from "../theme/font";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

type Props = {
  gutter?: number;
};

const FOOTER_MOBILE_MAX_WIDTH = 900;
const FOOTER_STACK_MAX_WIDTH = 1100;
const SUPPORT_TELEGRAM_USERNAME = "kanokna_support_bot";
const SUPPORT_TELEGRAM_URL = `https://t.me/${SUPPORT_TELEGRAM_USERNAME}?start=site`;

function buildWhatsAppUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const digits = raw.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

export function SiteFooter({ gutter = spacing.md }: Props): JSX.Element | null {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const viewportWidth = isWeb
    ? Math.min(
        width,
        Number((globalThis as any).window?.visualViewport?.width ?? width),
        Number((globalThis as any).window?.innerWidth ?? width),
        Number((globalThis as any).document?.documentElement?.clientWidth ?? width)
      )
    : width;
  const mediaMobile = isWeb
    ? Boolean((globalThis as any).window?.matchMedia?.(`(max-width: ${FOOTER_MOBILE_MAX_WIDTH - 1}px)`)?.matches)
    : false;
  const mediaStacked = isWeb
    ? Boolean((globalThis as any).window?.matchMedia?.(`(max-width: ${FOOTER_STACK_MAX_WIDTH - 1}px)`)?.matches)
    : false;
  const footerIsMobile = mediaMobile || viewportWidth < FOOTER_MOBILE_MAX_WIDTH;
  const footerIsTablet = !footerIsMobile && (mediaStacked || viewportWidth < FOOTER_STACK_MAX_WIDTH);
  const footerIsStacked = footerIsMobile || footerIsTablet;
  const pushToBottom = !footerIsStacked;
  const webWrapText = isWeb ? ({ wordBreak: "break-word", overflowWrap: "anywhere", whiteSpace: "normal" } as object) : null;

  const settingsQuery = useQuery({
    queryKey: ["app_settings", "site"],
    queryFn: fetchSiteSettings,
    enabled: isWeb
  });

  const isLoading = settingsQuery.isLoading;
  const settings = settingsQuery.data ?? {};
  const brandName = settings.brandName ?? "WindowDoor Store";
  const tagline = settings.tagline ?? "";

  const whatsappUrl = settings.whatsapp ? buildWhatsAppUrl(settings.whatsapp) : "";
  const telegramUrl = SUPPORT_TELEGRAM_URL;

  const hasContacts = Boolean(whatsappUrl || telegramUrl);
  const showContacts = Boolean(hasContacts || isLoading);

  const copyrightText =
    settings.copyrightText ?? `© ${new Date().getFullYear()} ${brandName}`;

  const openExternal = (url: string) => {
    const win = (globalThis as any).window as { open?: (url: string, target?: string, features?: string) => void } | undefined;
    if (win?.open) {
      win.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const styles = useMemo(() => makeStyles(theme, footerIsStacked, footerIsMobile), [theme, footerIsStacked, footerIsMobile]);

  if (!isWeb) return null;

  const safeBottom = Number.isFinite(insets.bottom) ? insets.bottom : 0;
  const safeLeft = Number.isFinite(insets.left) ? insets.left : 0;
  const safeRight = Number.isFinite(insets.right) ? insets.right : 0;

  const glassBg = theme.isDark ? "rgba(36,36,38,0.78)" : "rgba(243,245,248,0.88)";
  const glassBorder = theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";

  return (
    <View
      style={[
        styles.root,
        pushToBottom ? ({ marginTop: "auto" } as any) : null,
        {
          borderColor: glassBorder,
          backgroundColor: glassBg,
          ...( !footerIsStacked
            ? ({
                backdropFilter: "blur(14px) saturate(110%)",
                WebkitBackdropFilter: "blur(14px) saturate(110%)",
              } as object)
            : null ),
        }
      ]}
    >
      <View
        style={[
        styles.content,
          {
            maxWidth: theme.layout.maxWidth,
            paddingLeft: gutter + safeLeft,
            paddingRight: gutter + safeRight,
            paddingBottom: spacing.md + safeBottom
          }
        ]}
      >
        <View style={styles.inner}>
          <View style={styles.colBrand}>
            {isLoading ? (
              <>
                <View style={[styles.skeletonLine, styles.skeletonBrand]} />
                <View style={[styles.skeletonLine, styles.skeletonTagline]} />
              </>
            ) : (
              <>
                <Text
                  style={[styles.brand, { color: theme.colors.text }, webWrapText]}
                  numberOfLines={footerIsStacked ? undefined : 1}
                >
                  {brandName}
                </Text>
                {tagline ? (
                  <Text
                    style={[styles.tagline, { color: theme.colors.textMuted }, webWrapText]}
                    numberOfLines={footerIsStacked ? undefined : 2}
                  >
                    {tagline}
                  </Text>
                ) : null}
              </>
            )}
          </View>

          {showContacts ? (
            <View style={styles.colContacts}>
              <Text style={[styles.colTitle, { color: theme.colors.textMuted }]}>{t("footer.contactTitle")}</Text>

              <View style={styles.contactIcons}>
                {isLoading ? (
                  <>
                    <View style={[styles.iconBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.primarySoft }]} />
                    <View style={[styles.iconBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.primarySoft }]} />
                  </>
                ) : null}
                {!isLoading && whatsappUrl ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="WhatsApp"
                    onPress={() => openExternal(whatsappUrl)}
                    hitSlop={6}
                    style={(state) => [
                      styles.iconBtn,
                      { borderColor: theme.colors.border, backgroundColor: theme.colors.primarySoft },
                      state.pressed ? styles.iconPressed : null
                    ]}
                  >
                    <FontAwesome name="whatsapp" size={18} color="#25D366" />
                  </Pressable>
                ) : null}
                {!isLoading && telegramUrl ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Telegram"
                    onPress={() => openExternal(telegramUrl)}
                    hitSlop={6}
                    style={(state) => [
                      styles.iconBtn,
                      { borderColor: theme.colors.border, backgroundColor: theme.colors.primarySoft },
                      state.pressed ? styles.iconPressed : null
                    ]}
                  >
                    <FontAwesome name="telegram" size={18} color="#2AABEE" />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.bottomRow, { borderTopColor: glassBorder }]}>
          <Text
            style={[styles.bottomText, { color: theme.colors.textMuted }, webWrapText]}
            numberOfLines={footerIsStacked ? undefined : 1}
          >
            {copyrightText}
          </Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(
  theme: ReturnType<typeof useTheme>,
  isStacked: boolean,
  isMobile: boolean
): ReturnType<typeof StyleSheet.create> {
  const skeleton = theme.isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)";
  const stackedGap = isMobile ? spacing.md : spacing.lg;

  return StyleSheet.create({
    root: {
      borderWidth: 1,
      width: "100%",
      borderRadius: radius.lg,
      overflow: isStacked ? "visible" : "hidden",
    },
    content: {
      width: "100%",
      alignSelf: "center",
      paddingTop: spacing.md,
    },
    inner: {
      flexDirection: isStacked ? "column" : "row",
      flexWrap: isStacked ? "nowrap" : "wrap",
      alignItems: isStacked ? "stretch" : "flex-start",
      justifyContent: isStacked ? "flex-start" : "space-between",
      gap: isStacked ? stackedGap : spacing.lg
    },
    colBrand: {
      flex: isStacked ? 0 : 1,
      minWidth: isStacked ? 0 : 220,
      width: isStacked ? "100%" : undefined,
      maxWidth: "100%",
      gap: 6
    },
    brand: {
      ...font(900),
      fontSize: 16,
      lineHeight: 20,
      letterSpacing: 0.2
    },
    tagline: {
      fontSize: 12,
      lineHeight: 16
    },
    colContacts: {
      flex: isStacked ? 0 : 1,
      minWidth: isStacked ? 0 : 220,
      width: isStacked ? "100%" : undefined,
      maxWidth: "100%",
      marginTop: isStacked ? (isMobile ? spacing.xl : spacing.lg) : 0,
      paddingTop: isStacked ? (isMobile ? spacing.lg : spacing.md) : 0,
      borderTopWidth: isStacked ? 1 : 0,
      borderTopColor: theme.colors.border,
      gap: spacing.sm
    },
    colTitle: {
      ...font(800),
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: "uppercase"
    },
    contactIcons: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignSelf: "stretch",
      marginTop: isStacked ? spacing.sm : 0,
      gap: 10
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      ...( { cursor: "pointer" } as object )
    },
    iconPressed: {
      opacity: 0.88
    },
    skeletonLine: {
      height: 12,
      borderRadius: 999,
      backgroundColor: skeleton
    },
    skeletonBrand: {
      width: 160,
      height: 14
    },
    skeletonTagline: {
      width: 220,
      height: 12,
      marginTop: 6
    },
    skeletonPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12
    },
    bottomRow: {
      marginTop: isStacked ? spacing.md : spacing.lg,
      paddingTop: spacing.sm,
      borderTopWidth: 1
    },
    bottomText: {
      fontSize: 12,
      lineHeight: 16
    }
  });
}
