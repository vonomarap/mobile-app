import { useMemo } from "react";
import { Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SiteSettings } from "../services/site-settings";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/font";
import { radius, spacing } from "../theme/tokens";
import { Card } from "./Card";

export function OfficialPartnerBlock({ settings }: { settings?: SiteSettings }): JSX.Element | null {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const { width } = useWindowDimensions();

  const isRu = (i18n.language || "").toLowerCase().startsWith("ru");
  const isNarrow = width < 560;

  const enabled = settings?.partnerEnabled ?? true;

  const content = useMemo(() => {
    const kicker = settings?.partnerKicker ?? (isRu ? "Официальный партнер" : "Official partner");
    const factoryName = settings?.partnerFactoryName ?? (isRu ? "Фабрика Дышащих Окон" : "Breathing Windows Factory");
    const description =
      settings?.partnerDescription ??
      (isRu
        ? "Работаем напрямую с производством. Оригинальные комплектующие и гарантия."
        : "We work directly with the factory. Genuine components and warranty support.");
    const logoUrl = settings?.partnerLogoUrl ?? "";

    const fallbackBullets = isRu
      ? ([
          "Прямые поставки с производства",
          "Оригинальные комплектующие",
          "Гарантия и поддержка"
        ] as const)
      : ([
          "Direct supplies from the factory",
          "Genuine components",
          "Warranty and support"
        ] as const);
    const bulletsRaw = settings?.partnerBullets?.length ? settings.partnerBullets : [...fallbackBullets];
    const bullets = bulletsRaw.map((item) => item.trim()).filter(Boolean).slice(0, 6);

    return { kicker, factoryName, description, logoUrl, bullets };
  }, [isRu, settings?.partnerBullets, settings?.partnerDescription, settings?.partnerFactoryName, settings?.partnerKicker, settings?.partnerLogoUrl]);

  if (!enabled) return null;

  const frameColors = theme.isDark
    ? (["rgba(249,115,22,0.55)", "rgba(253,186,116,0.26)", "rgba(255,255,255,0.06)"] as const)
    : (["rgba(234,88,12,0.38)", "rgba(251,146,60,0.18)", "rgba(0,0,0,0.04)"] as const);

  return (
    <LinearGradient colors={frameColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.frame}>
      <Card
        variant="solid"
        padded={false}
        elevated
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: "transparent",
            borderWidth: 0
          }
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.decor,
            {
              backgroundColor: theme.isDark ? "rgba(249,115,22,0.10)" : "rgba(234,88,12,0.08)"
            }
          ]}
        />
        <View style={[styles.inner, isNarrow ? styles.innerNarrow : null]}>
          <View
            style={[
              styles.logoWrap,
              {
                backgroundColor: "#FFFFFF",
                borderColor: "rgba(0,0,0,0.10)",
                alignSelf: isNarrow ? "flex-start" : undefined
              }
            ]}
          >
            {content.logoUrl ? (
              <Image source={{ uri: content.logoUrl }} style={styles.logoImage} resizeMode="contain" />
            ) : (
              <Ionicons name="shield-checkmark-outline" size={26} color={theme.colors.primary} />
            )}
          </View>

          <View style={styles.content}>
            <View
              style={[
                styles.kickerPill,
                {
                  backgroundColor: theme.colors.primarySoft,
                  borderColor: theme.colors.primary
                }
              ]}
            >
              <Ionicons name="ribbon-outline" size={14} color={theme.colors.primary} />
              <Text style={[styles.kickerText, { color: theme.colors.primary }]} numberOfLines={1}>
                {content.kicker}
              </Text>
            </View>

            <Text style={[styles.factoryTitle, { color: theme.colors.text }]} numberOfLines={2}>
              {content.factoryName}
            </Text>

            {content.description ? (
              <Text style={[styles.description, { color: theme.colors.textMuted }]} numberOfLines={4}>
                {content.description}
              </Text>
            ) : null}

            {content.bullets.length ? (
              <View style={styles.bullets}>
                {content.bullets.map((bullet, idx) => (
                  <View key={`${bullet}-${idx}`} style={styles.bulletRow}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.success} />
                    <Text style={[styles.bulletText, { color: theme.colors.text }]}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Card>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  frame: {
    padding: 1,
    borderRadius: radius.lg
  },
  card: {
    borderRadius: radius.lg,
    overflow: "hidden"
  },
  decor: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8
  },
  inner: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  innerNarrow: {
    flexDirection: "column"
  },
  logoWrap: {
    width: 99,
    height: 76,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center"
  },
  logoImage: {
    width: "80%",
    height: "92%",
    alignSelf: "center"
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs
  },
  kickerPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 32
  },
  kickerText: {
    ...font(900),
    fontSize: 12,
    letterSpacing: 0.2
  },
  factoryTitle: {
    ...font(900),
    fontSize: 18,
    lineHeight: 22
  },
  description: {
    ...font(500),
    fontSize: 14,
    lineHeight: 20
  },
  bullets: {
    marginTop: spacing.sm,
    gap: spacing.sm
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  bulletText: {
    flex: 1,
    ...font(500),
    fontSize: 13,
    lineHeight: 18
  }
});
