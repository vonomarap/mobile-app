import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AppScrollView } from "../components/AppScrollView";
import { ScreenContainer } from "../components/ScreenContainer";
import { ScreenHeader } from "../components/ScreenHeader";
import { PromoBanners } from "../components/PromoBanners";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { SiteFooter } from "../components/SiteFooter";
import { MasonryGrid } from "../components/MasonryGrid";
import { ImageLightbox } from "../components/ImageLightbox";
import { fetchGallery, type GalleryItem } from "../services/storefront";
import { font } from "../theme/font";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

function GalleryCard({ item, imageHeight, onOpenLightbox }: { item: GalleryItem; imageHeight: number; onOpenLightbox: (item: GalleryItem, index: number) => void }): JSX.Element {
  const theme = useTheme();

  const images = useMemo(() => {
    const fromList = Array.isArray(item.images) ? item.images.filter((url) => typeof url === "string" && url.trim()) : [];
    if (fromList.length) return fromList;
    const fallback = item.imageUrl ? String(item.imageUrl).trim() : "";
    return fallback ? [fallback] : [];
  }, [item.imageUrl, item.images]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [item.id]);

  const total = images.length;

  useEffect(() => {
    setActiveIndex((prev) => (prev >= 0 && prev < total ? prev : 0));
  }, [total]);

  const hasMultiple = total > 1;
  const currentUrl = images[activeIndex] ?? images[0] ?? "";

  const navBg = theme.isDark ? "rgba(0,0,0,0.42)" : "rgba(11,18,32,0.34)";
  const navBorder = theme.isDark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.18)";
  const counterBg = theme.isDark ? "rgba(0,0,0,0.46)" : "rgba(11,18,32,0.44)";

  return (
    <Card style={[styles.card, { borderColor: theme.colors.border }]} padded={false} variant="solid">
      <Pressable onPress={() => onOpenLightbox(item, activeIndex)} style={[styles.media, { height: imageHeight }]}>
        {currentUrl ? (
          <Image source={{ uri: currentUrl }} style={styles.mediaImage} resizeMode="cover" />
        ) : (
          <View style={[styles.imageFallback, { backgroundColor: theme.colors.primarySoft }]} />
        )}

        {hasMultiple ? (
          <>
            <Pressable
              onPress={() => setActiveIndex((prev) => (prev - 1 + total) % total)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.navButton,
                styles.navButtonLeft,
                {
                  backgroundColor: navBg,
                  borderColor: navBorder,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Предыдущее фото"
            >
              <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            </Pressable>

            <Pressable
              onPress={() => setActiveIndex((prev) => (prev + 1) % total)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.navButton,
                styles.navButtonRight,
                {
                  backgroundColor: navBg,
                  borderColor: navBorder,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Следующее фото"
            >
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </Pressable>

            <View style={[styles.counterBadge, { backgroundColor: counterBg }]}>
              <Text style={styles.counterText}>
                {activeIndex + 1}/{total}
              </Text>
            </View>
          </>
        ) : null}
      </Pressable>

      <View style={styles.body}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          {item.projectType ? (
            <Text style={[styles.meta, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {item.projectType}
            </Text>
          ) : null}
          {item.projectType && item.city ? <Text style={[styles.metaDot, { color: theme.colors.textMuted }]}>•</Text> : null}
          {item.city ? (
            <View style={styles.cityRow}>
              <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
              <Text style={[styles.meta, { color: theme.colors.textMuted }]} numberOfLines={1}>
                {item.city}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export function GalleryScreen(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["gallery"], queryFn: fetchGallery });

  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = useCallback((item: GalleryItem, index: number) => {
    setLightboxItem(item);
    setLightboxIndex(index);
    setLightboxVisible(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxVisible(false);
  }, []);

  const numColumns = useMemo(() => {
    if (width >= 1100) return 3;
    if (width >= 420) return 2;
    return 1;
  }, [width]);

  const gutter = spacing.md;
  const gap = width < 420 ? spacing.sm : spacing.md;

  const minImgHeight = numColumns === 1 ? 200 : 160;
  const maxImgHeight = numColumns === 1 ? 420 : 360;

  const contentWidth = Math.max(0, Math.min(width, theme.layout.maxWidth) - gutter * 2);
  const columnWidth = numColumns > 0 ? (contentWidth - gap * (numColumns - 1)) / numColumns : contentWidth;

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
      <AppScrollView
        trackNavGlass
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { padding: gutter }]}
      >
        <View style={styles.header}>
          <PromoBanners placement="gallery" />
          <View style={styles.headerWrap}>
            <ScreenHeader title={t("gallery.title")} subtitle={t("gallery.subtitle")} />
          </View>
        </View>

        {(data ?? []).length ? (
          <MasonryGrid
            items={data ?? []}
            numColumns={numColumns}
            gap={gap}
            columnWidth={columnWidth}
            minImageHeight={minImgHeight}
            maxImageHeight={maxImgHeight}
            estimateItemHeight={(_, imageHeight) => imageHeight + 92}
            renderItem={({ item, imageHeight }) => (
              <GalleryCard item={item} imageHeight={imageHeight} onOpenLightbox={openLightbox} />
            )}
          />
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={[styles.empty, { color: theme.colors.textMuted }]}>{t("gallery.empty")}</Text>
          </View>
        )}

        <View style={styles.footerWrap}>
          <SiteFooter gutter={gutter} />
        </View>
      </AppScrollView>

      <ImageLightbox
        visible={lightboxVisible}
        item={lightboxItem}
        initialIndex={lightboxIndex}
        onClose={closeLightbox}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 0,
    gap: spacing.md,
  },
  header: {
    gap: spacing.md,
  },
  headerWrap: {
    gap: spacing.xs
  },
  card: {
    width: "100%",
  },
  media: {
    position: "relative",
    width: "100%",
    overflow: "hidden",
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    width: "100%",
    backgroundColor: "#E7EEF8",
    height: "100%",
  },
  navButton: {
    position: "absolute",
    top: "50%",
    width: 36,
    height: 36,
    marginTop: -18,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    ...( { cursor: "pointer" } as object ),
  },
  navButtonLeft: {
    left: 10,
  },
  navButtonRight: {
    right: 10,
  },
  counterBadge: {
    position: "absolute",
    right: 10,
    top: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  counterText: {
    ...font(900),
    fontSize: 12,
    color: "#FFFFFF",
  },
  body: {
    padding: spacing.sm,
    gap: 4
  },
  cardTitle: {
    ...font(700),
    fontSize: 16
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1
  },
  metaDot: {
    ...font(900),
    fontSize: 12,
  },
  meta: {
    fontSize: 13
  },
  emptyWrap: {
    paddingVertical: spacing.xl
  },
  footerWrap: {
    marginTop: "auto"
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
