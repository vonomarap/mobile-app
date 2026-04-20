import { Ionicons } from "@expo/vector-icons";
import { type NavigationProp, type RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { AppScrollView } from "../components/AppScrollView";
import { CollapsibleSection } from "../components/CollapsibleSection";
import { ScreenContainer } from "../components/ScreenContainer";
import { ScreenHeader } from "../components/ScreenHeader";
import { SiteFooter } from "../components/SiteFooter";
import type { HelpSectionKey, RootStackParamList } from "../navigation/types";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type FaqRoute = RouteProp<RootStackParamList, "Faq">;
type HelpActionKey = "calculator" | "catalog" | "contacts" | "chat";

type HelpSectionConfig = {
  key: HelpSectionKey;
  icon: IoniconName;
  items: readonly string[];
  highlights: readonly string[];
  cards?: readonly string[];
  actions: readonly HelpActionKey[];
};

const HELP_OVERVIEW: ReadonlyArray<{ key: "start" | "accuracy" | "support"; icon: IoniconName }> = [
  { key: "start", icon: "compass-outline" },
  { key: "accuracy", icon: "scan-outline" },
  { key: "support", icon: "chatbubble-ellipses-outline" },
];

const HELP_SECTIONS: ReadonlyArray<HelpSectionConfig> = [
  {
    key: "order",
    icon: "receipt-outline",
    items: ["estimate", "bundle", "request", "after"],
    highlights: ["calculator", "cart", "manager"],
    actions: ["calculator", "catalog"],
  },
  {
    key: "measurement",
    icon: "resize-outline",
    items: ["need", "self", "prep", "mistakes"],
    highlights: ["dimensions", "opening", "photos"],
    actions: ["calculator", "contacts"],
  },
  {
    key: "profiles",
    icon: "layers-outline",
    items: ["profileChoice", "glazingChoice", "hardwareChoice", "match"],
    highlights: ["profile", "glazing", "hardware"],
    cards: [
      "kbe",
      "bautex",
      "rehau",
      "kommerling",
      "singleUnit",
      "doubleUnit",
      "glazingWarmth",
      "energySound",
      "titanAf",
      "lineaSecustik",
    ],
    actions: ["calculator", "catalog"],
  },
  {
    key: "installation",
    icon: "hammer-outline",
    items: ["timing", "warmInstall", "delivery", "aftercare"],
    highlights: ["schedule", "warmInstall", "aftercare"],
    actions: ["contacts", "chat"],
  },
  {
    key: "repair",
    icon: "construct-outline",
    items: ["scope", "request", "visit", "urgent"],
    highlights: ["adjustment", "seal", "glazing"],
    actions: ["chat", "contacts"],
  },
  {
    key: "contact",
    icon: "chatbubbles-outline",
    items: ["speed", "region", "advice", "whatSend"],
    highlights: ["chat", "messengers", "phone"],
    actions: ["chat", "contacts"],
  },
];

const ACTION_ICONS: Record<HelpActionKey, IoniconName> = {
  calculator: "calculator-outline",
  catalog: "grid-outline",
  contacts: "call-outline",
  chat: "chatbubble-ellipses-outline",
};

function isInteractiveState(state: { pressed: boolean; hovered?: boolean }): boolean {
  return Boolean(state.pressed || (Platform.OS === "web" && state.hovered));
}

export function FaqScreen(): JSX.Element {
  const { t } = useTranslation();
  const route = useRoute<FaqRoute>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = isWeb && width >= theme.layout.desktopNavMinWidth;
  const gutter = width < 420 ? spacing.sm : spacing.md;
  const density = width < 420 ? "compact" : "default";
  const scrollRef = useRef<ScrollView | null>(null);
  const sectionOffsets = useRef<Partial<Record<HelpSectionKey, number>>>({});
  const targetSection = route.params?.section;
  const [activeSection, setActiveSection] = useState<HelpSectionKey>(targetSection ?? HELP_SECTIONS[0].key);

  const styles = useMemo(() => makeStyles(theme, isDesktopWeb, width < 640), [theme, isDesktopWeb, width]);

  const scrollToSection = useCallback((section: HelpSectionKey, animated = true) => {
    const y = sectionOffsets.current[section];
    if (typeof y !== "number") return;

    setActiveSection(section);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.sm), animated });
    });
  }, []);

  const handleActionPress = useCallback(
    (action: HelpActionKey) => {
      switch (action) {
        case "calculator":
          navigation.navigate("Calculator", { presetProductType: "window" });
          break;
        case "catalog":
          navigation.navigate("Catalog");
          break;
        case "contacts":
          navigation.navigate("Contacts");
          break;
        case "chat":
          navigation.navigate("SupportChat");
          break;
      }
    },
    [navigation]
  );

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pointer = event.nativeEvent.contentOffset.y + 96;
    let nextSection = HELP_SECTIONS[0].key;

    HELP_SECTIONS.forEach((section) => {
      const y = sectionOffsets.current[section.key];
      if (typeof y === "number" && y <= pointer) {
        nextSection = section.key;
      }
    });

    setActiveSection((current) => (current === nextSection ? current : nextSection));
  }, []);

  useEffect(() => {
    if (!targetSection) return;
    setActiveSection(targetSection);
    scrollToSection(targetSection, true);
  }, [scrollToSection, targetSection]);

  return (
    <ScreenContainer>
      <AppScrollView
        ref={scrollRef}
        trackNavGlass
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scroll, { padding: gutter }]}
      >
        <View style={styles.container}>
          <View style={styles.headerWrap}>
            <ScreenHeader
              title={t("help.title")}
              subtitle={t("help.subtitle")}
              align={isDesktopWeb ? "center" : "left"}
            />
          </View>

          <View style={styles.overviewGrid}>
            {HELP_OVERVIEW.map((card) => (
              <View
                key={card.key}
                style={[
                  styles.overviewCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <View style={[styles.overviewIcon, { backgroundColor: theme.colors.primarySoft }]}>
                  <Ionicons name={card.icon} size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.overviewCopy}>
                  <Text style={[styles.overviewTitle, { color: theme.colors.text }]}>
                    {t(`help.overview.${card.key}.title`)}
                  </Text>
                  <Text style={[styles.overviewBody, { color: theme.colors.textMuted }]}>
                    {t(`help.overview.${card.key}.body`)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.navWrap}>
            {isDesktopWeb ? (
              <View style={styles.navGrid}>
                {HELP_SECTIONS.map((section) => {
                  const active = activeSection === section.key;
                  return (
                    <Pressable
                      key={section.key}
                      accessibilityRole="button"
                      onPress={() => scrollToSection(section.key)}
                      style={(state) => [
                        styles.navButton,
                        {
                          backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
                          borderColor: active ? theme.colors.primary : theme.colors.border,
                        },
                        isInteractiveState(state as { pressed: boolean; hovered?: boolean }) ? styles.navButtonActive : null,
                      ]}
                    >
                      <Ionicons
                        name={section.icon}
                        size={16}
                        color={active ? theme.colors.primary : theme.colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.navLabel,
                          { color: active ? theme.colors.text : theme.colors.textMuted },
                        ]}
                      >
                        {t(`help.sections.${section.key}.title`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navRow}>
                {HELP_SECTIONS.map((section) => {
                  const active = activeSection === section.key;
                  return (
                    <Pressable
                      key={section.key}
                      accessibilityRole="button"
                      onPress={() => scrollToSection(section.key)}
                      style={(state) => [
                        styles.navButton,
                        {
                          backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
                          borderColor: active ? theme.colors.primary : theme.colors.border,
                        },
                        isInteractiveState(state as { pressed: boolean; hovered?: boolean }) ? styles.navButtonActive : null,
                      ]}
                    >
                      <Ionicons
                        name={section.icon}
                        size={16}
                        color={active ? theme.colors.primary : theme.colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.navLabel,
                          { color: active ? theme.colors.text : theme.colors.textMuted },
                        ]}
                      >
                        {t(`help.sections.${section.key}.title`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={styles.list}>
            {HELP_SECTIONS.map((section, sectionIndex) => (
              <View
                key={section.key}
                style={[
                  styles.section,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
                onLayout={(event) => {
                  const nextY = Math.round(event.nativeEvent.layout.y);
                  sectionOffsets.current[section.key] = nextY;
                  if (targetSection === section.key) {
                    scrollToSection(section.key, false);
                  }
                }}
              >
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
                    <Ionicons name={section.icon} size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.sectionCopy}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                      {t(`help.sections.${section.key}.title`)}
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
                      {t(`help.sections.${section.key}.subtitle`)}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.sectionIntro, { color: theme.colors.textMuted }]}>
                  {t(`help.sections.${section.key}.intro`)}
                </Text>

                <View style={styles.highlightGrid}>
                  {section.highlights.map((highlightKey) => (
                    <View
                      key={`${section.key}-${highlightKey}`}
                      style={[
                        styles.highlightCard,
                        { backgroundColor: theme.colors.bg, borderColor: theme.colors.border },
                      ]}
                    >
                      <Text style={[styles.highlightTitle, { color: theme.colors.text }]}>
                        {t(`help.sections.${section.key}.highlights.${highlightKey}.title`)}
                      </Text>
                      <Text style={[styles.highlightBody, { color: theme.colors.textMuted }]}>
                        {t(`help.sections.${section.key}.highlights.${highlightKey}.body`)}
                      </Text>
                    </View>
                  ))}
                </View>

                {section.cards?.length ? (
                  <View style={styles.cardGrid}>
                    {section.cards.map((cardKey) => (
                      <View
                        key={`${section.key}-${cardKey}`}
                        style={[
                          styles.infoCard,
                          { backgroundColor: theme.colors.bg, borderColor: theme.colors.border },
                        ]}
                      >
                        <Text style={[styles.infoMeta, { color: theme.colors.primary }]}>
                          {t(`help.sections.${section.key}.cards.${cardKey}.meta`)}
                        </Text>
                        <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
                          {t(`help.sections.${section.key}.cards.${cardKey}.title`)}
                        </Text>
                        <Text style={[styles.infoBody, { color: theme.colors.textMuted }]}>
                          {t(`help.sections.${section.key}.cards.${cardKey}.body`)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <Text style={[styles.clusterTitle, { color: theme.colors.text }]}>
                  {t("help.faqLabel")}
                </Text>

                <View style={styles.sectionList}>
                  {section.items.map((itemKey, itemIndex) => (
                    <CollapsibleSection
                      key={`${section.key}-${itemKey}`}
                      title={t(`help.sections.${section.key}.items.${itemKey}.question`)}
                      defaultExpanded={sectionIndex === 0 && itemIndex === 0}
                      density={density}
                      leftSlot={<Ionicons name={section.icon} size={18} color={theme.colors.primary} />}
                    >
                      <Text style={[styles.answer, { color: theme.colors.textMuted }]}>
                        {t(`help.sections.${section.key}.items.${itemKey}.answer`)}
                      </Text>
                    </CollapsibleSection>
                  ))}
                </View>

                <View style={styles.actionsWrap}>
                  <Text style={[styles.clusterTitle, { color: theme.colors.text }]}>
                    {t("help.actionsLabel")}
                  </Text>
                  <View style={styles.actionsRow}>
                    {section.actions.map((action) => (
                      <Pressable
                        key={`${section.key}-${action}`}
                        accessibilityRole="button"
                        onPress={() => handleActionPress(action)}
                        style={(state) => {
                          const active = isInteractiveState(state as { pressed: boolean; hovered?: boolean });
                          return [
                            styles.actionButton,
                            {
                              backgroundColor: active ? theme.colors.primarySoft : theme.colors.bg,
                              borderColor: active ? theme.colors.primary : theme.colors.border,
                            },
                          ];
                        }}
                      >
                        {(state) => {
                          const active = isInteractiveState(state as { pressed: boolean; hovered?: boolean });
                          return (
                            <>
                              <Ionicons
                                name={ACTION_ICONS[action]}
                                size={18}
                                color={active ? theme.colors.primary : theme.colors.textMuted}
                              />
                              <Text
                                style={[
                                  styles.actionLabel,
                                  { color: active ? theme.colors.text : theme.colors.textMuted },
                                ]}
                              >
                                {t(`help.actions.${action}`)}
                              </Text>
                            </>
                          );
                        }}
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.footerWrap}>
            <SiteFooter gutter={gutter} />
          </View>
        </View>
      </AppScrollView>
    </ScreenContainer>
  );
}

function makeStyles(
  theme: ReturnType<typeof useTheme>,
  isDesktopWeb: boolean,
  isCompactViewport: boolean
): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    scroll: {
      flexGrow: 1,
      paddingBottom: 0,
    },
    container: {
      width: "100%",
      maxWidth: 1080,
      alignSelf: "center",
      gap: spacing.md,
      paddingBottom: 0,
    },
    headerWrap: {
      ...(isDesktopWeb ? ({ alignItems: "center" } as object) : null),
      marginBottom: spacing.xs,
    },
    overviewGrid: {
      flexDirection: isDesktopWeb ? "row" : "column",
      flexWrap: isDesktopWeb ? "wrap" : "nowrap",
      gap: spacing.sm,
    },
    overviewCard: {
      flexGrow: 1,
      minWidth: isDesktopWeb ? 240 : 0,
      borderWidth: 1,
      borderRadius: 8,
      padding: spacing.md,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
    },
    overviewIcon: {
      width: 40,
      height: 40,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    overviewCopy: {
      flex: 1,
      gap: 4,
      minWidth: 0,
    },
    overviewTitle: {
      ...font(900),
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: 0,
    },
    overviewBody: {
      fontSize: 13,
      lineHeight: 19,
    },
    navWrap: {
      gap: spacing.sm,
    },
    navGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: spacing.sm,
    },
    navRow: {
      gap: spacing.sm,
      paddingRight: spacing.xs,
    },
    navButton: {
      minHeight: 42,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    navButtonActive: {
      opacity: 0.92,
    },
    navLabel: {
      ...font(800),
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
    },
    list: {
      gap: spacing.lg,
    },
    section: {
      gap: spacing.md,
      borderWidth: 1,
      borderRadius: 8,
      padding: isCompactViewport ? spacing.md : spacing.lg,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
    },
    sectionIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionCopy: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    sectionTitle: {
      ...font(900),
      fontSize: 20,
      lineHeight: 24,
      letterSpacing: 0,
    },
    sectionSubtitle: {
      fontSize: 13,
      lineHeight: 18,
    },
    sectionIntro: {
      fontSize: 15,
      lineHeight: 22,
    },
    highlightGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    highlightCard: {
      flexGrow: 1,
      minWidth: isDesktopWeb ? 220 : 0,
      borderWidth: 1,
      borderRadius: 8,
      padding: spacing.md,
      gap: spacing.xs,
    },
    highlightTitle: {
      ...font(900),
      fontSize: 14,
      lineHeight: 18,
      letterSpacing: 0,
    },
    highlightBody: {
      fontSize: 13,
      lineHeight: 19,
    },
    cardGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    infoCard: {
      flexGrow: 1,
      minWidth: isDesktopWeb ? 220 : 0,
      borderWidth: 1,
      borderRadius: 8,
      padding: spacing.md,
      gap: 6,
    },
    infoMeta: {
      ...font(800),
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0,
      textTransform: "uppercase",
    },
    infoTitle: {
      ...font(900),
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: 0,
    },
    infoBody: {
      fontSize: 13,
      lineHeight: 19,
    },
    clusterTitle: {
      ...font(900),
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: 0,
    },
    sectionList: {
      gap: spacing.sm,
    },
    actionsWrap: {
      gap: spacing.sm,
    },
    actionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    actionButton: {
      minHeight: 44,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    actionLabel: {
      ...font(800),
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
    },
    answer: {
      fontSize: 14,
      lineHeight: 20,
    },
    footerWrap: {
      marginTop: spacing.sm,
    },
  });
}
