import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PropsWithChildren, useEffect, useMemo, useRef, useState } from "react";
import { ProductCard } from "../components/ProductCard";
import { AppFlatList } from "../components/AppFlatList";
import { ScreenContainer } from "../components/ScreenContainer";
import { ScreenHeader } from "../components/ScreenHeader";
import { PromoBanners } from "../components/PromoBanners";
import { IconSegmentedControl } from "../components/IconSegmentedControl";
import { TextField } from "../components/TextField";
import { EmptyState } from "../components/EmptyState";
import { SiteFooter } from "../components/SiteFooter";
import { fetchProducts, fetchProductsCount, fetchProductsPage } from "../services/storefront";
import type { ProductPageCursor } from "../services/storefront";
import { radius, spacing } from "../theme/tokens";
import { font } from "../theme/font";
import { useTheme } from "../theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";

function inferProductType(title: string, description?: string): "window" | "door" | undefined {
  const hay = `${title} ${description ?? ""}`.toLowerCase();
  if (hay.includes("двер") || hay.includes("door")) return "door";
  if (hay.includes("окн") || hay.includes("window")) return "window";
  if (hay.includes("балкон")) return "door";
  return undefined;
}

const PAGE_SIZE = 8;
type SortMode = "catalog" | "title_asc" | "price_asc" | "price_desc";

function AnimatedCatalogItem({
  index,
  token,
  reduceMotion,
  mode,
  children
}: PropsWithChildren<{
  index: number;
  token: number;
  reduceMotion: boolean;
  mode: "grid" | "list";
}>): JSX.Element {
  const enter = useRef(new Animated.Value(reduceMotion || token === 0 ? 1 : 0)).current;

  useEffect(() => {
    enter.stopAnimation();
    if (reduceMotion || token === 0) {
      enter.setValue(1);
      return;
    }

    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 260,
      delay: Math.min(index * 28, 220),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [enter, index, reduceMotion, token]);

  const translateY = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0]
  });

  return (
    <Animated.View
      style={[
        mode === "grid" ? styles.animGrid : styles.animList,
        {
          opacity: enter,
          transform: [{ translateY }]
        }
      ]}
    >
      {children}
    </Animated.View>
  );
}

function PagerButton({
  disabled,
  accessibilityLabel,
  onPress,
  reduceMotion,
  children
}: PropsWithChildren<{
  disabled?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  reduceMotion: boolean;
}>): JSX.Element {
  const theme = useTheme();
  const hover = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!disabled) return;
    hover.stopAnimation();
    press.stopAnimation();
    hover.setValue(0);
    press.setValue(0);
  }, [disabled, hover, press]);

  const glowWebStyle =
    Platform.OS === "web"
      ? ({
          boxShadow:
            "0 0 0 1px rgba(249,115,22,0.55), 0 12px 32px rgba(249,115,22,0.28), 0 0 64px rgba(249,115,22,0.22)"
        } as any)
      : null;

  const animate = (value: Animated.Value, toValue: number, duration: number) => {
    value.stopAnimation();
    if (reduceMotion) {
      value.setValue(toValue);
      return;
    }
    Animated.timing(value, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  };

  const setHover = (next: 0 | 1) => {
    if (disabled) return;
    animate(hover, next, next === 1 ? 160 : 120);
  };

  const setPress = (next: 0 | 1) => {
    if (disabled) return;
    animate(press, next, next === 1 ? 90 : 120);
  };

  const scale = Animated.multiply(
    hover.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }),
    press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] })
  );

  const overlayOpacity = Animated.add(hover, press).interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: "clamp"
  });

  const overlayScale = hover.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1.02] });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => setPress(1)}
        onPressOut={() => setPress(0)}
        onHoverIn={Platform.OS === "web" ? () => setHover(1) : undefined}
        onHoverOut={Platform.OS === "web" ? () => setHover(0) : undefined}
        onFocus={Platform.OS === "web" ? () => setHover(1) : undefined}
        onBlur={Platform.OS === "web" ? () => setHover(0) : undefined}
        style={[
          styles.pagerBtn,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          disabled ? styles.pagerBtnDisabled : null,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pagerBtnOverlay,
            glowWebStyle,
            {
              opacity: disabled ? 0 : overlayOpacity,
              transform: [{ scale: overlayScale }]
            }
          ]}
        />
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function CatalogScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const [queryText, setQueryText] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortMode, setSortMode] = useState<SortMode>("catalog");
  const [page, setPage] = useState(1);
  const [animToken, setAnimToken] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const trimmedQuery = queryText.trim();
  const needsAll = trimmedQuery.length > 0 || sortMode !== "catalog";

  const productsAllQuery = useQuery({
    queryKey: ["products", "all"],
    queryFn: fetchProducts,
    enabled: needsAll
  });

  const productsPagedQuery = useInfiniteQuery({
    queryKey: ["products", "paged", "catalog"],
    enabled: !needsAll,
    initialPageParam: null as ProductPageCursor,
    queryFn: ({ pageParam }) => fetchProductsPage({ pageSize: PAGE_SIZE, cursor: pageParam }),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.cursor : undefined),
  });

  const productsCountQuery = useQuery({
    queryKey: ["products", "count"],
    queryFn: fetchProductsCount,
    enabled: !needsAll
  });

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (mounted) setReduceMotion(Boolean(v));
      })
      .catch(() => undefined);

    const sub = (AccessibilityInfo as any).addEventListener?.("reduceMotionChanged", (v: boolean) => {
      setReduceMotion(Boolean(v));
    });

    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [sortMode, trimmedQuery]);

  const handleSortChange = (next: SortMode) => {
    if (next === sortMode) return;
    setSortMode(next);
    setAnimToken((v) => v + 1);
  };

  const handleViewChange = (next: "grid" | "list") => {
    if (next === viewMode) return;
    setViewMode(next);
    setAnimToken((v) => v + 1);
  };

  const numColumns = useMemo(() => {
    if (viewMode === "list") return 1;
    if (width >= 1200) return 4;
    if (width >= 900) return 3;
    if (width >= 360) return 2;
    return 1;
  }, [viewMode, width]);

  const isDesktop = isWeb && width >= theme.layout.desktopNavMinWidth;
  const desktopCardGap = isDesktop ? spacing.sm * 1.15 : spacing.sm;
  const contentWidth = Math.min(width, theme.layout.maxWidth);
  const sideMargin = Math.max(0, Math.floor((width - contentWidth) / 2));
  // Give strong hover glows room to render without being clipped by the scroll viewport.
  // Only "bleed" into the available side margin to avoid horizontal scrolling on narrower screens.
  const glowGutter = isDesktop && viewMode === "grid" ? Math.min(96, sideMargin) : 0;

  const gridCellWidth = useMemo(() => {
    if (viewMode !== "grid") return null;
    if (numColumns <= 1) return null;

    const padding = spacing.md; // styles.list uses spacing.md padding for grid
    const gap = isDesktop ? desktopCardGap : spacing.sm; // styles.row uses spacing.sm gap between columns
    const available = contentWidth - padding * 2 - gap * (numColumns - 1);
    return Math.max(160, Math.floor(available / numColumns));
  }, [contentWidth, desktopCardGap, isDesktop, numColumns, viewMode]);

  const filteredAll = useMemo(() => {
    const q = trimmedQuery.toLowerCase();
    const locale = i18n.language || undefined;

    const hasPrice = (value: unknown) => Number.isFinite(value) && (value as number) > 0;
    const getPrice = (value: unknown) => (hasPrice(value) ? (value as number) : null);

    const compareTitle = (a: { title: string }, b: { title: string }) =>
      String(a.title || "").localeCompare(String(b.title || ""), locale, { sensitivity: "base" });

    const getSortOrder = (value: number | undefined) =>
      typeof value === "number" && Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;

    const searched = (productsAllQuery.data ?? []).filter((item) => {
      if (!q) return true;
      const hay = `${item.title} ${item.description ?? ""}`.toLowerCase();
      return hay.includes(q);
    });

    const sorted = [...searched].sort((a, b) => {
      if (sortMode === "catalog") {
        const ao = getSortOrder(a.sortOrder);
        const bo = getSortOrder(b.sortOrder);
        if (ao !== bo) return ao - bo;
        return compareTitle(a, b);
      }
      if (sortMode === "title_asc") return compareTitle(a, b);

      const ap = getPrice(a.priceFrom);
      const bp = getPrice(b.priceFrom);

      if (ap === null && bp === null) return compareTitle(a, b);
      if (ap === null) return 1;
      if (bp === null) return -1;

      const diff = sortMode === "price_desc" ? bp - ap : ap - bp;
      if (diff !== 0) return diff;
      return compareTitle(a, b);
    });

    return sorted;
  }, [i18n.language, productsAllQuery.data, sortMode, trimmedQuery]);

  const totalPagesAll = Math.max(1, Math.ceil(filteredAll.length / PAGE_SIZE));
  const pageItemsAll = filteredAll.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pagedPages = productsPagedQuery.data?.pages ?? [];
  const loadedPages = pagedPages.length;
  const pageItemsPaged = pagedPages[page - 1]?.items ?? [];

  const totalPagesPaged =
    typeof productsCountQuery.data === "number" ? Math.max(1, Math.ceil(productsCountQuery.data / PAGE_SIZE)) : null;

  const pageItems = needsAll ? pageItemsAll : pageItemsPaged;
  const showPager = needsAll
    ? filteredAll.length > PAGE_SIZE
    : totalPagesPaged
    ? totalPagesPaged > 1
    : loadedPages > 1 || Boolean(productsPagedQuery.hasNextPage);

  const canPrev = page > 1;
  const canNext = needsAll
    ? page < totalPagesAll
    : totalPagesPaged
    ? page < totalPagesPaged
    : page < loadedPages || Boolean(productsPagedQuery.hasNextPage);

  useEffect(() => {
    if (needsAll) {
      if (page > totalPagesAll) setPage(totalPagesAll);
      return;
    }

    if (totalPagesPaged) {
      if (page > totalPagesPaged) setPage(totalPagesPaged);
      return;
    }

    const safeLoadedPages = loadedPages || 1;
    if (page > safeLoadedPages) setPage(safeLoadedPages);
  }, [loadedPages, needsAll, page, totalPagesAll, totalPagesPaged]);

  const isLoading = needsAll ? productsAllQuery.isLoading : productsPagedQuery.isLoading;
  const isError = needsAll ? productsAllQuery.isError : productsPagedQuery.isError;
  const refetch = () => {
    if (needsAll) {
      void productsAllQuery.refetch();
    } else {
      void productsPagedQuery.refetch();
      void productsCountQuery.refetch();
    }
  };

  const pagerText = needsAll
    ? `${page} / ${totalPagesAll}`
    : totalPagesPaged
    ? `${page} / ${totalPagesPaged}`
    : `${page} / …`;

  const nextBusy = !needsAll && productsPagedQuery.isFetchingNextPage;
  const prevDisabled = !canPrev;
  const nextDisabled = !canNext || nextBusy;

  const goPrev = () => {
    if (!canPrev) return;
    setPage((p) => Math.max(1, p - 1));
  };

  const goNext = async () => {
    if (!canNext) return;
    if (needsAll) {
      setPage((p) => p + 1);
      return;
    }

    if (page < loadedPages) {
      setPage((p) => p + 1);
      return;
    }

    if (!productsPagedQuery.hasNextPage || productsPagedQuery.isFetchingNextPage) return;
    const res = await productsPagedQuery.fetchNextPage();
    if (!res.isError) {
      setPage((p) => p + 1);
    }
  };

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
        key={`mode-${viewMode}-cols-${numColumns}-page-${page}-${needsAll ? "all" : "paged"}`}
        data={pageItems}
        keyExtractor={(item) => item.id}
        style={Platform.OS === "web" && glowGutter ? ({ marginHorizontal: -glowGutter } as any) : undefined}
        contentContainerStyle={[
          styles.list,
          viewMode === "list" ? styles.listList : null,
          viewMode === "grid" && isDesktop ? { gap: desktopCardGap } : null,
          viewMode === "grid" && glowGutter ? { paddingHorizontal: spacing.md + glowGutter } : null,
        ]}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? [styles.row, viewMode === "grid" && isDesktop ? { gap: desktopCardGap } : null] : undefined}
        ItemSeparatorComponent={
          numColumns === 1 ? () => <View style={{ height: viewMode === "list" ? spacing.xs * 2.6 : spacing.md }} /> : undefined
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <PromoBanners placement="catalog" />
            <ScreenHeader title={t("catalog.title")} subtitle={t("catalog.subtitle")} />
            <TextField
              label={t("common.search")}
              leftSlot={<Ionicons name="search-outline" size={18} color={theme.colors.primary} />}
              value={queryText}
              onChangeText={setQueryText}
              placeholder={t("catalog.searchPlaceholder")}
              returnKeyType="search"
              autoCapitalize="none"
            />
            <View style={styles.filters}>
              <IconSegmentedControl
                value={sortMode}
                options={[
                  { value: "catalog", label: t("catalog.filters.sort.catalog"), icon: "reorder-three-outline" },
                  { value: "title_asc", label: t("catalog.filters.sort.titleAsc"), icon: "text-outline" },
                  { value: "price_asc", label: t("catalog.filters.sort.priceAsc"), icon: "trending-up-outline" },
                  { value: "price_desc", label: t("catalog.filters.sort.priceDesc"), icon: "trending-down-outline" },
                ]}
                onChange={handleSortChange}
              />

              <IconSegmentedControl
                value={viewMode}
                options={[
                  { value: "grid", label: t("catalog.filters.view.grid"), icon: "grid-outline" },
                  { value: "list", label: t("catalog.filters.view.list"), icon: "list-outline" },
                ]}
                onChange={handleViewChange}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.empty, { color: theme.colors.textMuted }]}>{t("catalog.empty")}</Text>
          </View>
        }
		        ListFooterComponent={
		          <View style={[{ gap: spacing.md }, isDesktop ? ({ marginTop: "auto" } as any) : null]}>
		            {showPager ? (
		              <View style={styles.pagerWrap}>
	                <View
	                  style={[
	                    styles.pagerBar,
	                    {
	                      backgroundColor: theme.isDark ? "rgba(22,22,23,0.42)" : "rgba(255,255,255,0.78)",
	                      borderColor: theme.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)"
	                    }
	                  ]}
	                >
	                  <PagerButton
	                    accessibilityLabel={t("catalog.pager.prev")}
	                    onPress={goPrev}
	                    disabled={prevDisabled}
	                    reduceMotion={reduceMotion}
	                  >
	                    <Ionicons
	                      name="chevron-back-outline"
	                      size={18}
	                      color={prevDisabled ? theme.colors.textMuted : theme.colors.text}
	                    />
	                  </PagerButton>

	                  <Text style={[styles.pagerText, { color: theme.colors.text }]} numberOfLines={1}>
	                    {pagerText}
	                  </Text>

	                  <PagerButton
	                    accessibilityLabel={t("catalog.pager.next")}
	                    onPress={() => void goNext()}
	                    disabled={nextDisabled}
	                    reduceMotion={reduceMotion}
	                  >
	                    {nextBusy ? (
	                      <ActivityIndicator size="small" color={theme.colors.primary} />
	                    ) : (
	                      <Ionicons
	                        name="chevron-forward-outline"
	                        size={18}
	                        color={nextDisabled ? theme.colors.textMuted : theme.colors.text}
	                      />
	                    )}
	                  </PagerButton>
	                </View>
	              </View>
	            ) : (
	              <View style={{ height: spacing.lg }} />
	            )}

	            <SiteFooter gutter={viewMode === "list" ? spacing.sm : spacing.md} />
	          </View>
	        }
        renderItem={({ item, index }) => {
          const kind = inferProductType(item.title, item.description);
          const onPress = () => navigation.navigate("ProductDetails", { productId: item.id });

          if (viewMode === "list") {
            return (
              <AnimatedCatalogItem
                key={`${item.id}-${animToken}`}
                index={index}
                token={animToken}
                reduceMotion={reduceMotion}
                mode={viewMode}
              >
                <ProductCard item={item} kind={kind} onPress={onPress} variant="list" />
              </AnimatedCatalogItem>
            );
          }

          const card = (
            <AnimatedCatalogItem
              key={`${item.id}-${animToken}`}
              index={index}
              token={animToken}
              reduceMotion={reduceMotion}
              mode={viewMode}
            >
              <ProductCard item={item} kind={kind} onPress={onPress} variant="grid" />
            </AnimatedCatalogItem>
          );

          if (gridCellWidth && numColumns > 1) {
            // Ensure hover shadows/glows can render outside the fixed-width cell.
            return <View style={{ width: gridCellWidth, overflow: "visible" }}>{card}</View>;
          }

          return card;
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    paddingBottom: 0,
    gap: spacing.sm
  },
  listList: {
    padding: spacing.sm,
    paddingBottom: 0,
    gap: 0
  },
  animGrid: {
    flex: 1,
    overflow: "visible"
  },
  animList: {
    width: "100%",
    overflow: "visible"
  },
  row: {
    gap: spacing.sm,
    justifyContent: "flex-start",
    overflow: "visible"
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.md
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm
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
  },
  pagerWrap: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: "center"
  },
  pagerBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 999,
    padding: 6
  },
  pagerBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    ...( { cursor: "pointer" } as object )
  },
  pagerBtnOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.55)",
    backgroundColor: "rgba(249,115,22,0.10)",
  },
  pagerBtnDisabled: {
    opacity: 0.48
  },
  pagerText: {
    minWidth: 80,
    textAlign: "center",
    ...font(900),
    fontSize: 13,
    letterSpacing: 0.2
  }
});
