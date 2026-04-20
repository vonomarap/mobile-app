import { FontAwesome } from "@expo/vector-icons";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { PropsWithChildren, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { MAX_CONTACT_ICON } from "../constants/contactAssets";
import type { HelpSectionKey, RootStackParamList } from "../navigation/types";
import { fetchSiteSettings } from "../services/site-settings";
import { font } from "../theme/font";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { buildExternalUrl, buildMailtoUrl, buildPhoneUrl, buildTelegramUrl, buildWhatsAppUrl } from "../utils/contact-links";

type Props = {
  gutter?: number;
};

type FooterAction = {
  key: string;
  label: string;
  renderIcon: (active: boolean) => JSX.Element;
  onPress: () => void;
};

const FOOTER_MOBILE_MAX_WIDTH = 900;
const FOOTER_STACK_MAX_WIDTH = 1100;
const SUPPORT_TELEGRAM_USERNAME = "kanokna_support_bot";
const SUPPORT_TELEGRAM_FALLBACK = `${SUPPORT_TELEGRAM_USERNAME}?start=site`;
const OLD_LOCAL_GEO_RE = /канев|kanev|каневск|kanevsk|каневской|каневском|район|district/i;
const HELP_FOOTER_LINKS: ReadonlyArray<HelpSectionKey> = [
  "order",
  "measurement",
  "profiles",
  "installation",
  "repair",
  "contact",
];

function sanitizeRegionalText(value?: string | null): string | undefined {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return undefined;
  if (OLD_LOCAL_GEO_RE.test(trimmed)) return undefined;
  return trimmed;
}

function isFooterActionActive(state: { pressed: boolean; hovered?: boolean }): boolean {
  return Boolean(state.pressed || (Platform.OS === "web" && state.hovered));
}

function getMaxFooterIconStyle(active: boolean, mutedColor: string): object[] {
  return [
    { width: 18, height: 18 },
    active
      ? { opacity: 1 }
      : Platform.OS === "web"
        ? ({ filter: "grayscale(1)", opacity: 0.72 } as object)
        : { tintColor: mutedColor, opacity: 0.78 },
  ];
}

function FooterAccordionSection({
  title,
  expanded,
  onToggle,
  borderColor,
  titleColor,
  children
}: PropsWithChildren<{
  title: string;
  expanded: boolean;
  onToggle: () => void;
  borderColor: string;
  titleColor: string;
}>): JSX.Element {
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();
  }, [expanded, progress]);

  const onMeasure = (event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight > 0 && nextHeight !== measuredHeight) {
      setMeasuredHeight(nextHeight);
    }
  };

  const contentHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, measuredHeight || 0]
  });

  const contentOpacity = progress.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0, 0.2, 1]
  });

  const chevronRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"]
  });

  return (
    <View style={[accordionStyles.section, { borderTopColor: borderColor }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [accordionStyles.header, pressed ? accordionStyles.headerPressed : null]}
      >
        <Text style={[accordionStyles.title, { color: titleColor }]}>{title}</Text>
        <Animated.View style={{ transform: [{ rotateZ: chevronRotate }] }}>
          <FontAwesome name="angle-down" size={18} color={titleColor} />
        </Animated.View>
      </Pressable>

      <Animated.View
        style={[
          accordionStyles.bodyClip,
          {
            height: contentHeight,
            opacity: contentOpacity
          }
        ]}
        pointerEvents={expanded ? "auto" : "none"}
      >
        <View style={accordionStyles.measureWrap} onLayout={onMeasure}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

export function SiteFooter({ gutter = spacing.md }: Props): JSX.Element | null {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
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
  const styles = useMemo(() => makeStyles(theme, footerIsStacked, footerIsMobile), [theme, footerIsStacked, footerIsMobile]);

  const settingsQuery = useQuery({
    queryKey: ["app_settings", "site"],
    queryFn: fetchSiteSettings,
    enabled: isWeb
  });

  const isLoading = settingsQuery.isLoading;
  const settings = settingsQuery.data ?? {};
  const brandName = sanitizeRegionalText(settings.brandName) ?? "КанОкна";
  const tagline = sanitizeRegionalText(settings.tagline) ?? t("footer.regionTagline");

  function openExternal(url: string) {
    const win = (globalThis as any).window as
      | { open?: (url: string, target?: string, features?: string) => void; location?: { href?: string } }
      | undefined;
    if (/^(mailto:|tel:)/i.test(url) && win?.location) {
      win.location.href = url;
      return;
    }
    if (win?.open) {
      win.open(url, "_blank", "noopener,noreferrer");
    }
  }

  const phoneRaw = settings.phone?.trim() ?? "";
  const phoneUrl = phoneRaw ? buildPhoneUrl(phoneRaw) : "";
  const emailRaw = settings.email?.trim() ?? "";
  const emailUrl = emailRaw ? buildMailtoUrl(emailRaw) : "";
  const whatsappUrl = settings.whatsapp ? buildWhatsAppUrl(settings.whatsapp) : "";
  const telegramSource = settings.telegram?.trim() || SUPPORT_TELEGRAM_FALLBACK;
  const telegramUrl = buildTelegramUrl(telegramSource);
  const maxRaw = settings.maxUrl?.trim() ?? "";
  const maxUrl = maxRaw ? buildExternalUrl(maxRaw) : "";
  const mutedIconColor = theme.colors.textMuted;

  const directContacts = [
    phoneUrl
      ? {
          key: "phone",
          label: t("contacts.phone"),
          renderIcon: (active: boolean) => (
            <FontAwesome name="phone" size={14} color={active ? theme.colors.primary : mutedIconColor} />
          ),
          onPress: () => openExternal(phoneUrl),
        }
      : null,
    emailUrl
      ? {
          key: "email",
          label: t("contacts.email"),
          renderIcon: (active: boolean) => (
            <FontAwesome name="envelope-o" size={14} color={active ? theme.colors.primary : mutedIconColor} />
          ),
          onPress: () => openExternal(emailUrl),
        }
      : null,
  ].filter((item): item is FooterAction => Boolean(item));

  const messengerContacts = [
    whatsappUrl
      ? {
          key: "whatsapp",
          label: t("contacts.whatsapp"),
          renderIcon: (active: boolean) => <FontAwesome name="whatsapp" size={18} color={active ? "#25D366" : mutedIconColor} />,
          onPress: () => openExternal(whatsappUrl),
        }
      : null,
    telegramUrl
      ? {
          key: "telegram",
          label: t("contacts.telegram"),
          renderIcon: (active: boolean) => <FontAwesome name="telegram" size={18} color={active ? "#2AABEE" : mutedIconColor} />,
          onPress: () => openExternal(telegramUrl),
        }
      : null,
    maxUrl
      ? {
          key: "max",
          label: t("contacts.max"),
          renderIcon: (active: boolean) => (
            <Image
              source={MAX_CONTACT_ICON}
              style={getMaxFooterIconStyle(active, mutedIconColor)}
              resizeMode="contain"
            />
          ),
          onPress: () => openExternal(maxUrl),
        }
      : null,
  ].filter((item): item is FooterAction => Boolean(item));

  const footerActions = [...directContacts, ...messengerContacts];
  const hasContacts = Boolean(footerActions.length);
  const showContacts = Boolean(hasContacts || isLoading);
  const [contactsExpanded, setContactsExpanded] = useState(showContacts);
  const [contactsTouched, setContactsTouched] = useState(false);
  const [faqExpanded, setFaqExpanded] = useState(false);

  const copyrightText =
    sanitizeRegionalText(settings.copyrightText) ?? `© ${new Date().getFullYear()} ${brandName}`;

  const openHelpSection = (section: HelpSectionKey) => {
    navigation.navigate("Faq", { section });
  };

  useEffect(() => {
    if (!footerIsMobile) return;
    if (!showContacts) {
      setContactsExpanded(false);
      return;
    }
    if (!contactsTouched) {
      setContactsExpanded(true);
    }
  }, [contactsTouched, footerIsMobile, showContacts]);

  if (!isWeb) return null;

  const safeBottom = Number.isFinite(insets.bottom) ? insets.bottom : 0;
  const safeLeft = Number.isFinite(insets.left) ? insets.left : 0;
  const safeRight = Number.isFinite(insets.right) ? insets.right : 0;
  const glassBg = theme.isDark ? "rgba(36,36,38,0.78)" : "rgba(243,245,248,0.88)";
  const glassBorder = theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";

  const renderContactButtons = (compact = false) => (
    <View style={[styles.actionButtons, compact ? styles.actionButtonsCompact : null]}>
      {isLoading ? (
        <>
          <View style={[styles.actionBtn, styles.actionBtnSkeleton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]} />
          <View style={[styles.actionBtn, styles.actionBtnSkeleton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]} />
        </>
      ) : null}
      {!isLoading
        ? footerActions.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={item.onPress}
              hitSlop={6}
              style={(state) => {
                const active = isFooterActionActive(state as { pressed: boolean; hovered?: boolean });
                return [
                  styles.actionBtn,
                  {
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                    backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
                  },
                  state.pressed ? styles.iconPressed : null
                ];
              }}
            >
              {(state) => {
                const active = isFooterActionActive(state as { pressed: boolean; hovered?: boolean });
                return <View style={styles.actionBtnIcon}>{item.renderIcon(active)}</View>;
              }}
            </Pressable>
          ))
        : null}
    </View>
  );
  const renderHelpLinks = () => (
    <View style={styles.helpLinks}>
      {HELP_FOOTER_LINKS.map((section) => (
        <Pressable
          key={section}
          accessibilityRole="link"
          accessibilityLabel={t(`footer.helpLinks.${section}`)}
          onPress={() => openHelpSection(section)}
          hitSlop={6}
          style={(state) => [styles.helpLinkItem, state.pressed ? styles.textLinkPressed : null]}
        >
          <Text style={[styles.helpLinkLabel, { color: theme.colors.text }, webWrapText]}>
            {t(`footer.helpLinks.${section}`)}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View
      style={[
        styles.shell,
        pushToBottom ? ({ marginTop: "auto" } as any) : null,
      ]}
    >
      <View
        style={[
          styles.root,
          {
            borderColor: glassBorder,
            backgroundColor: glassBg,
            ...(!footerIsStacked
              ? ({
                  backdropFilter: "blur(14px) saturate(110%)",
                  WebkitBackdropFilter: "blur(14px) saturate(110%)",
                } as object)
              : null),
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
          <View style={[styles.inner, footerIsMobile ? styles.innerMobile : null]}>
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

            {footerIsMobile ? (
              <View style={styles.mobileSections}>
                {showContacts ? (
                  <FooterAccordionSection
                    title={t("footer.contactTitle")}
                    expanded={contactsExpanded}
                    onToggle={() => {
                      setContactsTouched(true);
                      setContactsExpanded((prev) => !prev);
                    }}
                    borderColor={theme.colors.border}
                    titleColor={theme.colors.textMuted}
                  >
                    {renderContactButtons(true)}
                  </FooterAccordionSection>
                ) : null}

                <FooterAccordionSection
                  title={t("footer.faqTitle")}
                  expanded={faqExpanded}
                  onToggle={() => setFaqExpanded((prev) => !prev)}
                  borderColor={theme.colors.border}
                  titleColor={theme.colors.textMuted}
                >
                  {renderHelpLinks()}
                </FooterAccordionSection>
              </View>
            ) : (
              <>
                {showContacts ? (
                  <View style={styles.colContacts}>
                    <Text style={[styles.colTitle, { color: theme.colors.textMuted }]}>{t("footer.contactTitle")}</Text>
                    {renderContactButtons()}
                  </View>
                ) : null}

                <View style={styles.colFaq}>
                  <Text style={[styles.colTitle, { color: theme.colors.textMuted }]}>{t("footer.faqTitle")}</Text>
                  {renderHelpLinks()}
                </View>
              </>
            )}
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
    shell: {
      width: "100%",
      paddingTop: spacing.xl,
    },
    root: {
      borderWidth: 1,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
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
    innerMobile: {
      gap: 0
    },
    colBrand: {
      flex: isStacked ? 0 : 1,
      minWidth: isStacked ? 0 : 220,
      width: isStacked ? "100%" : undefined,
      maxWidth: "100%",
      gap: 6
    },
    mobileSections: {
      width: "100%",
      marginTop: spacing.xl
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
    colFaq: {
      flex: isStacked ? 0 : 1,
      minWidth: isStacked ? 0 : 220,
      width: isStacked ? "100%" : undefined,
      maxWidth: "100%",
      marginTop: isStacked ? 0 : 0,
      gap: spacing.sm
    },
    colTitle: {
      ...font(800),
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: "uppercase"
    },
    actionButtons: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignSelf: "stretch",
      marginTop: isStacked ? spacing.sm : 0,
      gap: 10
    },
    actionButtonsCompact: {
      marginTop: 0
    },
    actionBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      ...( { cursor: "pointer" } as object )
    },
    actionBtnSkeleton: {
      width: 38,
    },
    actionBtnIcon: {
      width: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    iconPressed: {
      opacity: 0.88
    },
    helpLinks: {
      gap: 6
    },
    helpLinkItem: {
      paddingVertical: 4,
      ...( { cursor: "pointer" } as object )
    },
    helpLinkLabel: {
      ...font(800),
      fontSize: 13,
      lineHeight: 18
    },
    textLinkPressed: {
      opacity: 0.66
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

const accordionStyles = StyleSheet.create({
  section: {
    width: "100%",
    borderTopWidth: 1
  },
  header: {
    minHeight: 48,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    ...( { cursor: "pointer" } as object )
  },
  headerPressed: {
    opacity: 0.88
  },
  title: {
    ...font(800),
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    flex: 1
  },
  bodyClip: {
    overflow: "hidden"
  },
  measureWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingBottom: spacing.sm
  }
});
