import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AppScrollView } from "../components/AppScrollView";
import { ScreenContainer } from "../components/ScreenContainer";
import { PromoBanners } from "../components/PromoBanners";
import { Card } from "../components/Card";
import { SiteFooter } from "../components/SiteFooter";
import { EmptyState } from "../components/EmptyState";
import { fetchSiteSettings } from "../services/site-settings";
import { fetchGallery } from "../services/storefront";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { RootStackParamList } from "../navigation/types";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const GALLERY_COUNT = 4;

const BENEFITS = [
  { icon: "shield-checkmark-outline" as const, titleKey: "home.benefits.warranty", descKey: "home.benefits.warrantyDesc" },
  { icon: "checkmark-done-outline" as const, titleKey: "home.benefits.original", descKey: "home.benefits.originalDesc" },
];

function HeroBlock(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktop = isWeb && width >= theme.layout.maxWidth;

  const settingsQuery = useQuery({
    queryKey: ["app_settings", "site"],
    queryFn: fetchSiteSettings,
    enabled: isWeb,
  });
  const brand = (settingsQuery.data?.brandName?.trim()) || t("home.hero.title");
  const tagline = (settingsQuery.data?.tagline?.trim()) || t("home.hero.subtitle");

  const circle1Scale = useRef(new Animated.Value(1)).current;
  const circle1Opacity = useRef(new Animated.Value(0.7)).current;
  const circle2Scale = useRef(new Animated.Value(1)).current;
  const circle2Opacity = useRef(new Animated.Value(0.5)).current;

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(16)).current;
  const subOpacity = useRef(new Animated.Value(0)).current;
  const subY = useRef(new Animated.Value(12)).current;

  const accent = theme.isDark ? "rgba(249,115,22," : "rgba(234,88,12,";

  useEffect(() => {
    const pulse1 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(circle1Scale, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
          Animated.timing(circle1Opacity, { toValue: 0.9, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(circle1Scale, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(circle1Opacity, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
        ]),
      ]),
    );

    const pulse2 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(circle2Scale, { toValue: 1.06, duration: 2200, useNativeDriver: true }),
          Animated.timing(circle2Opacity, { toValue: 0.8, duration: 2200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(circle2Scale, { toValue: 1, duration: 2200, useNativeDriver: true }),
          Animated.timing(circle2Opacity, { toValue: 0.5, duration: 2200, useNativeDriver: true }),
        ]),
      ]),
    );

    pulse1.start();
    pulse2.start();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(subOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(subY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    return () => {
      pulse1.stop();
      pulse2.stop();
    };
  }, []);

  const gradientColors = theme.isDark
    ? (["#0F0F10", `${accent}0.08)`] as const)
    : (["#F7F7F8", `${accent}0.04)`] as const);

  return (
    <View style={styles.hero}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <Animated.View pointerEvents="none" style={[styles.heroDecorCircle, { backgroundColor: `${accent}0.10)`, transform: [{ scale: circle1Scale }], opacity: circle1Opacity }]} />
      <Animated.View pointerEvents="none" style={[styles.heroDecorCircle2, { backgroundColor: `${accent}0.08)`, transform: [{ scale: circle2Scale }], opacity: circle2Opacity }]} />
      <View style={[styles.heroInner, { maxWidth: theme.layout.maxWidth }]}>
        <Animated.Text style={[styles.heroTitle, { color: theme.colors.text, opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
          {brand}
        </Animated.Text>
        <Animated.Text style={[styles.heroSub, { color: theme.colors.textMuted, opacity: subOpacity, transform: [{ translateY: subY }] }]}>
          {tagline}
        </Animated.Text>
      </View>
    </View>
  );
}

function BenefitsRow(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktop = isWeb && width >= theme.layout.desktopNavMinWidth;

  const iconBg = theme.isDark ? "rgba(249,115,22,0.12)" : "rgba(234,88,12,0.08)";

  return (
    <View style={[styles.benefitsOuter, { maxWidth: theme.layout.maxWidth }]}>
      <View style={[styles.benefitsRow, isDesktop ? styles.benefitsRowDesktop : null]}>
        {BENEFITS.map((item) => (
          <View key={item.titleKey} style={[styles.benefitItem, { borderBottomColor: theme.colors.border }]}>
            <View style={[styles.benefitIcon, { backgroundColor: iconBg }]}>
              <Ionicons name={item.icon} size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.benefitText}>
              <Text style={[styles.benefitTitle, { color: theme.colors.text }]}>
                {t(item.titleKey)}
              </Text>
              <Text style={[styles.benefitDesc, { color: theme.colors.textMuted }]}>
                {t(item.descKey)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function GalleryBlock(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavProp>();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktop = isWeb && width >= theme.layout.desktopNavMinWidth;

  const galleryQuery = useQuery({
    queryKey: ["gallery", "home"],
    queryFn: () => fetchGallery().then((items) => items.slice(0, GALLERY_COUNT)),
  });

  const items = galleryQuery.data ?? [];

  if (galleryQuery.isLoading) {
    return <View style={styles.section}><ActivityIndicator color={theme.colors.primary} /></View>;
  }

  if (!items.length) {
    return (
      <View style={styles.section}>
        <EmptyState
          icon={<Ionicons name="images-outline" size={22} color={theme.colors.primary} />}
          title={t("gallery.empty")}
          description=""
        />
      </View>
    );
  }

  const cols = isDesktop ? 4 : 2;
  const gap = isDesktop ? 16 : 10;
  const pad = isDesktop ? 48 : 24;
  const availableWidth = Math.min(width, theme.layout.maxWidth) - pad * 2;
  const cardWidth = Math.floor((availableWidth - gap * (cols - 1)) / cols);
  const imgH = isDesktop ? 220 : 170;

  return (
    <View style={[styles.section, { paddingHorizontal: pad }]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {t("home.gallery.title")}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("home.gallery.seeAll")}
          onPress={() => navigation.navigate("Gallery")}
          style={({ pressed }) => [
            styles.seeAll,
            pressed ? { opacity: 0.7 } : null,
          ]}
        >
          <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
            {t("home.gallery.seeAll")}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.galleryRow, { gap }]}>
        {items.slice(0, isDesktop ? 4 : GALLERY_COUNT).map((item) => {
          const img = item.images?.[0] ?? item.imageUrl ?? "";
          return (
            <Pressable
              key={item.id}
              onPress={() => navigation.navigate("Gallery")}
              style={({ pressed }) => [{ width: cardWidth }, pressed ? { opacity: 0.92 } : null]}
            >
              <Card padded={false} variant="solid" style={{ borderColor: theme.colors.border, borderRadius: 16, overflow: "hidden" }}>
                {img ? (
                  <Image source={{ uri: img }} style={{ width: "100%", height: imgH }} resizeMode="cover" />
                ) : (
                  <View style={{ width: "100%", height: imgH, backgroundColor: theme.colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="image-outline" size={28} color={theme.colors.primary} />
                  </View>
                )}
                <View style={{ padding: 14, gap: 3 }}>
                  <Text style={[styles.galleryTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title || "\u2014"}</Text>
                  {item.city ? <Text style={[styles.galleryCity, { color: theme.colors.textMuted }]} numberOfLines={1}>{item.city}</Text> : null}
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
function FactoryInfoBlock(): JSX.Element {
  const theme = useTheme();

  return (
    <View style={[styles.factoryInfo, { maxWidth: theme.layout.maxWidth }]}>
      <Text style={[styles.factoryInfoTitle, { color: theme.colors.text }]}>
        Информация о Заводе
      </Text>
      <Text style={[styles.factoryInfoText, { color: theme.colors.textMuted }]}>
        ФАБРИКА ДЫШАЩИХ ОКОН — ПАРТНЁР PROFINE (KBE, Kömmerling) и REHAU
      </Text>
      <Pressable onPress={() => Linking.openURL("https://oknafdo.ru/plastic_windows/")}>
        <Text style={[styles.factoryLink, { color: theme.colors.primary }]}>
          Сайт завода →
        </Text>
      </Pressable>
    </View>
  );
}

export function HomeScreen(): JSX.Element {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktop = isWeb && width >= theme.layout.desktopNavMinWidth;

  return (
    <ScreenContainer>
      <AppScrollView trackNavGlass contentContainerStyle={[styles.scrollContent, { paddingBottom: isDesktop ? 80 : 0 }]}>
        <PromoBanners placement="home" />
        <HeroBlock />
        <BenefitsRow />
        <FactoryInfoBlock />
        <GalleryBlock />
        <SiteFooter gutter={isDesktop ? 48 : 24} />
      </AppScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 48,
  },

  hero: {
    position: "relative",
    overflow: "hidden",
  },
  heroDecorCircle: {
    position: "absolute",
    top: -40,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  heroDecorCircle2: {
    position: "absolute",
    bottom: -30,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  heroInner: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 48,
    paddingTop: 72,
    paddingBottom: 56,
    gap: 20,
  },
  heroTitle: {
    ...font(900),
    fontSize: 48,
    lineHeight: 54,
    letterSpacing: -1.2,
  },
  heroSub: {
    ...font(400),
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 520,
  },

  benefitsOuter: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
  },
  benefitsRow: {
    gap: 0,
  },
  benefitsRowDesktop: {
    flexDirection: "row",
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  benefitText: {
    flex: 1,
    gap: 2,
  },
  benefitTitle: {
    ...font(700),
    fontSize: 15,
    lineHeight: 20,
  },
  benefitDesc: {
    ...font(400),
    fontSize: 13,
    lineHeight: 18,
  },

  section: {
    gap: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 16,
  },
  sectionTitle: {
    ...font(900),
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    ...( { cursor: "pointer" } as object ),
  },
  seeAllText: {
    ...font(700),
    fontSize: 15,
  },

  factoryInfo: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
  },
  factoryInfoTitle: {
    ...font(900),
    fontSize: 20,
    lineHeight: 26,
    marginBottom: 12,
  },
  factoryInfoText: {
    ...font(500),
    fontSize: 15,
    lineHeight: 22,
  },
  factoryLink: {
    ...font(600),
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    textDecorationLine: "underline",
  },

  galleryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  galleryTitle: {
    ...font(700),
    fontSize: 15,
    lineHeight: 20,
  },
  galleryCity: {
    ...font(400),
    fontSize: 13,
    lineHeight: 18,
  },
});