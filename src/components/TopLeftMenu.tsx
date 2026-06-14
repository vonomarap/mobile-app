import type { ComponentProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { signOut } from "firebase/auth";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme, useThemeControls } from "../theme/ThemeProvider";
import { RootStackParamList } from "../navigation/types";
import { useNavGlass } from "../services/scroll-context";
import { useAuth } from "../services/auth-context";
import { useCart } from "../services/cart-context";
import { useCurrencyControls } from "../services/currency-context";
import { auth } from "../services/firebase";
import { type LangCode } from "../constants/languages";
import { getCurrentLanguage, setAppLanguage } from "../services/i18n";
import { formatMoney } from "../utils/money";
import { formatOrderItemLabel } from "../utils/order-items";
import { Card } from "./Card";
import { IconButton } from "./IconButton";
import { PrimaryButton } from "./PrimaryButton";

type RouteName = keyof RootStackParamList;

type TabItem = {
  route: RouteName;
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  activeIcon: ComponentProps<typeof Ionicons>["name"];
};

export function TopLeftMenu(): JSX.Element {
  const theme = useTheme();
  const { toggle: toggleTheme } = useThemeControls();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { user } = useAuth();
  const { currency } = useCurrencyControls();
  const { ready: cartReady, items: cartItems, removeItem, itemsSubtotal } = useCart();
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const accountProgress = useRef(new Animated.Value(0)).current;
  const cartProgress = useRef(new Animated.Value(0)).current;
  const moreProgress = useRef(new Animated.Value(0)).current;
  const accountTriggerRef = useRef<any>(null);
  const cartTriggerRef = useRef<any>(null);
  const accountPanelRef = useRef<any>(null);
  const cartPanelRef = useRef<any>(null);
  const [currentRoute, setCurrentRoute] = useState<RouteName | undefined>(() => {
    const name = (navigation as any).getCurrentRoute?.()?.name;
    return name as RouteName | undefined;
  });

  const styles = useMemo(() => makeStyles(theme), [theme]);
  const desktopNavEnabled = Platform.OS === "web" && width >= theme.layout.desktopNavMinWidth;
  const isNavGlass = useNavGlass();
  const accountPopoverWidth = Math.min(320, width - spacing.md * 2);
  const cartPopoverWidth = Math.min(380, width - spacing.md * 2);

  const navItems: Array<{ route: RouteName; label: string; icon: ComponentProps<typeof Ionicons>["name"] }> = [
    { route: "Home", label: t("tabs.home", { defaultValue: "Главная" }), icon: "home-outline" },
    { route: "Catalog", label: t("tabs.catalog"), icon: "grid-outline" },
    { route: "Moskitki", label: t("tabs.moskitki"), icon: "apps-outline" },
    { route: "Gallery", label: t("tabs.gallery"), icon: "images-outline" },
    { route: "Calculator", label: t("tabs.calculator"), icon: "calculator-outline" },
    { route: "Contacts", label: t("tabs.contacts"), icon: "call-outline" }
  ];

  const tabItems: TabItem[] = useMemo(() => [
    { route: "Home",       label: t("tabs.home", { defaultValue: "Главная" }), icon: "home-outline",      activeIcon: "home" },
    { route: "Catalog",    label: t("tabs.catalog"),                            icon: "albums-outline",    activeIcon: "albums" },
    { route: "Moskitki",   label: t("tabs.moskitki"),                           icon: "grid-outline",      activeIcon: "grid" },
    { route: "Calculator", label: t("tabs.calculator"),                         icon: "calculator-outline", activeIcon: "calculator" },
    { route: "Cart",       label: t("tabs.cart"),                               icon: "cart-outline",      activeIcon: "cart" }
  ], [t]);

  const moreItems: Array<{ route: RouteName; label: string; icon: ComponentProps<typeof Ionicons>["name"] }> = useMemo(() => [
    { route: "Account", label: t("tabs.account"), icon: "person-circle-outline" },
    { route: "Gallery", label: t("tabs.gallery"), icon: "images-outline" },
    { route: "Contacts", label: t("tabs.contacts"), icon: "call-outline" },
    { route: "SupportChat", label: t("tabs.help", { defaultValue: "Помощь" }), icon: "help-circle-outline" }
  ], [t]);

  const moreSheetOpacity = moreProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const moreSlideX = moreProgress.interpolate({ inputRange: [0, 1], outputRange: [width, 0] });
  const moreIconRotate = moreProgress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "90deg"] });
  const moreIconMenuOpacity = moreProgress.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: "clamp" });
  const moreIconCloseOpacity = moreProgress.interpolate({ inputRange: [0.15, 1], outputRange: [0, 1], extrapolate: "clamp" });
  const cartTooltip = cartItems.length ? `${t("cart.open")} (${cartItems.length})` : t("cart.open");
  const currentLang: LangCode = getCurrentLanguage();
  const orderMetaText = t("calculator.orderItemsCount", { defaultValue: "Позиции: {{count}}", count: cartItems.length });
  const themeMenuLabel = theme.isDark
    ? t("common.lightTheme", { defaultValue: "Светлая тема" })
    : t("common.darkTheme", { defaultValue: "Тёмная тема" });
  const themeMenuIcon: ComponentProps<typeof Ionicons>["name"] = theme.isDark ? "sunny-outline" : "moon-outline";
  const nextLang: LangCode = currentLang === "ru" ? "en" : "ru";
  const languageToggleLabel = currentLang.toUpperCase();
  const accountBackdropOpacity = accountProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const accountPanelOpacity = accountProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const accountPanelTranslateY = accountProgress.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] });
  const accountPanelScale = accountProgress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  const accountHeaderOpacity = accountProgress.interpolate({
    inputRange: [0.06, 1],
    outputRange: [0, 1],
    extrapolate: "clamp"
  });
  const accountHeaderTranslateY = accountProgress.interpolate({
    inputRange: [0.06, 1],
    outputRange: [4, 0],
    extrapolate: "clamp"
  });
  const accountItemAnimStyle = (start: number) => ({
    opacity: accountProgress.interpolate({
      inputRange: [start, 1],
      outputRange: [0, 1],
      extrapolate: "clamp"
    }),
    transform: [
      {
        translateX: accountProgress.interpolate({
          inputRange: [start, 1],
          outputRange: [8, 0],
          extrapolate: "clamp"
        })
      }
    ]
  });

  const cartBackdropOpacity = cartProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const cartPanelOpacity = cartProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const cartPanelTranslateY = cartProgress.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] });
  const cartPanelScale = cartProgress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  function animateOpen(setOpen: (value: boolean) => void, animatedValue: Animated.Value, duration: number): void {
    setOpen(true);
    animatedValue.stopAnimation();
    if (reduceMotion) {
      animatedValue.setValue(1);
      return;
    }
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }

  function animateClose(
    isOpen: boolean,
    setOpen: (value: boolean) => void,
    animatedValue: Animated.Value,
    duration: number
  ): void {
    if (!isOpen) return;
    animatedValue.stopAnimation();
    if (reduceMotion) {
      animatedValue.setValue(0);
      setOpen(false);
      return;
    }
    Animated.timing(animatedValue, {
      toValue: 0,
      duration,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) setOpen(false);
    });
  }

  function animateImmediate(setOpen: (value: boolean) => void, animatedValue: Animated.Value): void {
    animatedValue.stopAnimation();
    animatedValue.setValue(0);
    setOpen(false);
  }

  function closeAccountMenuImmediate(): void {
    animateImmediate(setAccountOpen, accountProgress);
  }

  function closeCartPanelImmediate(): void {
    animateImmediate(setCartOpen, cartProgress);
  }

  function closeMoreImmediate(): void {
    animateImmediate(setMoreOpen, moreProgress);
  }

  function openMore(): void {
    animateOpen(setMoreOpen, moreProgress, 260);
  }

  function closeMore(): void {
    animateClose(moreOpen, setMoreOpen, moreProgress, 200);
  }

  function toggleMore(): void {
    if (moreOpen) {
      closeMore();
    } else {
      openMore();
    }
  }

  function openAccountMenu(): void {
    closeCartPanelImmediate();
    closeMoreImmediate();
    if (accountOpen) return;
    animateOpen(setAccountOpen, accountProgress, 260);
  }

  function closeAccountMenu(): void {
    animateClose(accountOpen, setAccountOpen, accountProgress, 200);
  }

  function openCartPanel(): void {
    closeAccountMenuImmediate();
    closeMoreImmediate();
    if (cartOpen) return;
    animateOpen(setCartOpen, cartProgress, 280);
  }

  function closeCartPanel(): void {
    animateClose(cartOpen, setCartOpen, cartProgress, 220);
  }

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduceMotion(Boolean(value));
      })
      .catch(() => undefined);

    const sub = (AccessibilityInfo as any).addEventListener?.("reduceMotionChanged", (value: boolean) => {
      setReduceMotion(Boolean(value));
    });

    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    closeAccountMenuImmediate();
    closeCartPanelImmediate();
    closeMoreImmediate();
  }, [desktopNavEnabled]);

  useEffect(() => {
    const update = () => {
      const name = (navigation as any).getCurrentRoute?.()?.name;
      setCurrentRoute(name as RouteName | undefined);
    };

    update();
    const unsubscribe = (navigation as any).addListener?.("state", update);
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [navigation]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!accountOpen && !cartOpen) return;

    const win = (globalThis as any).window as any;
    const doc = (globalThis as any).document as any;
    if (!win || !doc) return;

    const close = () => {
      closeAccountMenuImmediate();
      closeCartPanelImmediate();
    };

    win.addEventListener?.("wheel", close, { passive: true });
    win.addEventListener?.("touchmove", close, { passive: true });
    doc.addEventListener?.("scroll", close, true);

    return () => {
      win.removeEventListener?.("wheel", close);
      win.removeEventListener?.("touchmove", close);
      doc.removeEventListener?.("scroll", close, true);
    };
  }, [accountOpen, cartOpen]);

  useEffect(() => {
    if (!desktopNavEnabled) return;
    if (Platform.OS !== "web") return;
    if (!accountOpen && !cartOpen) return;

    const doc = (globalThis as any).document as any;
    if (!doc) return;

    const containsTarget = (node: any, target: EventTarget | null): boolean => {
      if (!node || !target || typeof node.contains !== "function") return false;
      return node.contains(target);
    };

    const handlePointerDown = (event: Event) => {
      const target = event.target;
      const insideAccount =
        containsTarget(accountTriggerRef.current, target) || containsTarget(accountPanelRef.current, target);
      const insideCart = containsTarget(cartTriggerRef.current, target) || containsTarget(cartPanelRef.current, target);

      if (accountOpen && !insideAccount) {
        closeAccountMenuImmediate();
      }

      if (cartOpen && !insideCart) {
        closeCartPanelImmediate();
      }
    };

    doc.addEventListener?.("mousedown", handlePointerDown, true);

    return () => {
      doc.removeEventListener?.("mousedown", handlePointerDown, true);
    };
  }, [accountOpen, cartOpen, desktopNavEnabled]);

  const setLanguage = async (next: LangCode) => {
    if (currentLang === next) return;
    await setAppLanguage(next);
  };

  const openRoute = (route: RouteName) => {
    closeAccountMenuImmediate();
    closeCartPanelImmediate();
    closeMoreImmediate();
    if (route === currentRoute) {
      if (moreOpen) closeMore();
      return;
    }
    (navigation as any).navigate(route);
  };

  const openCartPage = () => {
    closeAccountMenuImmediate();
    closeCartPanelImmediate();

    if (Platform.OS === "web") {
      const location = (globalThis as any).location as { pathname?: string; assign?: (url: string) => void; href?: string } | undefined;
      if (location?.pathname === "/cart") return;
      if (typeof location?.assign === "function") {
        location.assign("/cart");
        return;
      }
      if (location) {
        location.href = "/cart";
        return;
      }
    }

    if (currentRoute === "Cart") return;
    (navigation as any).navigate("Cart");
  };

  const openCart = () => {
    if (desktopNavEnabled) {
      openCartPanel();
      return;
    }

    if (cartOpen) {
      closeCartPanel();
      return;
    }
    openCartPanel();
  };

  const onDesktopAccountHoverIn = () => {
    if (!desktopNavEnabled) return;
    openAccountMenu();
  };

  const onDesktopCartHoverIn = () => {
    if (!desktopNavEnabled) return;
    openCartPanel();
  };

  const onAccountTriggerPress = () => {
    if (desktopNavEnabled) {
      openAccountMenu();
      return;
    }

    if (accountOpen) {
      closeAccountMenu();
      return;
    }

    openAccountMenu();
  };

  const openCalculatorFromCart = () => {
    closeAccountMenuImmediate();
    closeCartPanelImmediate();
    if (currentRoute === "Calculator") return;
    (navigation as any).navigate("Calculator");
  };

  const onSignOut = async () => {
    closeAccountMenuImmediate();
    try {
      await signOut(auth);
    } catch (error) {
      console.warn("signOut failed:", error);
    }
  };

  const renderSharedBackdrop = (opacity: Animated.AnimatedInterpolation<number>) => (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.backdrop,
        {
          opacity,
          backgroundColor: theme.isDark ? "rgba(0,0,0,0.26)" : "rgba(0,0,0,0.18)",
        },
        Platform.OS === "web"
          ? ({
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)"
            } as object)
          : null
      ]}
    />
  );

  const renderAccountCard = () => (
    <Card variant="solid" padded={false} elevated={false} style={styles.accountMenuCard}>
      <Animated.View
        style={{
          opacity: accountHeaderOpacity,
          transform: [{ translateY: accountHeaderTranslateY }]
        }}
      >
        <View style={styles.accountHeader}>
          <View style={styles.accountHeaderText}>
            <Text style={styles.popoverTitle} numberOfLines={1}>
              {t("account.title")}
            </Text>
          </View>
          <View style={styles.accountHeaderActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={themeMenuLabel}
              onPress={toggleTheme}
              style={(state) => [
                styles.accountActionButton,
                styles.accountActionButtonIcon,
                (state as unknown as { hovered?: boolean }).hovered ? styles.accountActionButtonHovered : null,
                state.pressed ? styles.accountActionButtonPressed : null
              ]}
            >
              <Ionicons name={themeMenuIcon} size={16} color={theme.colors.primary} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t("common.language", { defaultValue: "Язык" })}: ${languageToggleLabel}`}
              onPress={() => void setLanguage(nextLang)}
              style={(state) => [
                styles.accountActionButton,
                (state as unknown as { hovered?: boolean }).hovered ? styles.accountActionButtonHovered : null,
                state.pressed ? styles.accountActionButtonPressed : null
              ]}
            >
              <Text style={styles.accountActionLabel}>{languageToggleLabel}</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={accountItemAnimStyle(0.10)}>
        <MenuItem
          icon="receipt-outline"
          label={t("quotes.title")}
          selected={currentRoute === "Quotes"}
          onPress={() => openRoute("Quotes")}
        />
      </Animated.View>

      <Animated.View style={accountItemAnimStyle(0.14)}>
        <MenuItem
          icon="person-circle-outline"
          label={t("tabs.account")}
          selected={currentRoute === "Account"}
          onPress={() => openRoute("Account")}
        />
      </Animated.View>

      {user ? (
        <Animated.View style={accountItemAnimStyle(0.18)}>
          <MenuItem
            icon="log-out-outline"
            label={t("common.signOut")}
            selected={false}
            tone="danger"
            trailing="none"
            onPress={() => void onSignOut()}
          />
        </Animated.View>
      ) : null}
    </Card>
  );

  const renderCartCard = () => (
    <Card variant="solid" padded={false} elevated={false} style={styles.cartDrawerCard}>
      <View style={styles.popoverHeader}>
        <View style={[styles.popoverHeaderIcon, { backgroundColor: theme.colors.primarySoft }]}>
          <Ionicons name="cart-outline" size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.popoverHeaderCopy}>
          <Text style={styles.popoverTitle} numberOfLines={1}>
            {t("cart.title", { defaultValue: "Корзина" })}
          </Text>
        </View>
        <IconButton
          icon="close-outline"
          accessibilityLabel={t("common.close")}
          onPress={closeCartPanel}
          tone="soft"
          size={36}
          iconSize={16}
          enableTooltip={false}
        />
      </View>
      <View style={styles.menuDivider} />

      <View style={styles.cartDrawerBody}>
        {!cartReady ? (
          <View style={styles.cartDrawerState}>
            <Ionicons name="hourglass-outline" size={22} color={theme.colors.primary} />
            <Text style={[styles.cartDrawerStateText, { color: theme.colors.textMuted }]}> 
              {t("common.loading")}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.cartDrawerMetaRow}>
              <Text style={[styles.cartDrawerMetaTitle, { color: theme.colors.text }]}> 
                {t("calculator.orderSummary", { defaultValue: "Состав заказа" })}
              </Text>
              <Text style={[styles.cartDrawerMetaText, { color: theme.colors.textMuted }]}> 
                {orderMetaText}
              </Text>
            </View>

            <ScrollView
              style={styles.cartDrawerScroll}
              contentContainerStyle={styles.cartDrawerScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {cartItems.length ? (
                cartItems.map((item, index) => (
                  <View
                    key={item.localId}
                    style={[
                      styles.cartItemRow,
                      { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }
                    ]}
                  >
                    <View style={styles.cartItemMain}>
                      <Text style={[styles.cartItemTitle, { color: theme.colors.text }]} numberOfLines={3}>
                        {index + 1}. {formatOrderItemLabel(item, t)}
                      </Text>
                      <View style={styles.cartItemFooter}>
                        <Text style={[styles.cartItemPrice, { color: theme.colors.primary }]}>
                          {formatMoney(Number(item.preview?.total) || 0, currency)}
                        </Text>
                        <IconButton
                          icon="trash-outline"
                          accessibilityLabel={t("calculator.removeFromOrder", { defaultValue: "Удалить позицию" })}
                          onPress={() => removeItem(item.localId)}
                          tone="soft"
                          size={34}
                          iconSize={16}
                          enableTooltip={false}
                        />
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View
                  style={[
                    styles.cartDrawerEmpty,
                    { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }
                  ]}
                >
                  <Ionicons name="cart-outline" size={20} color={theme.colors.primary} />
                  <Text style={[styles.cartDrawerEmptyText, { color: theme.colors.textMuted }]}> 
                    {t("cart.empty", { defaultValue: "Корзина пуста" })}
                  </Text>
                </View>
              )}
            </ScrollView>
          </>
        )}
      </View>

      <View style={[styles.cartDrawerFooter, { borderTopColor: theme.colors.border }]}>
        <View style={styles.cartDrawerTotalRow}>
          <Text style={[styles.cartDrawerTotalLabel, { color: theme.colors.textMuted }]}> 
            {t("calculator.totalLabel")}
          </Text>
          <Text style={[styles.cartDrawerTotalValue, { color: theme.colors.text }]}> 
            {formatMoney(itemsSubtotal, currency)}
          </Text>
        </View>
        <Text style={[styles.cartDrawerDisclaimer, { color: theme.colors.textMuted }]}>
          {t("quotes.details.preliminaryShort")}
        </Text>

        <PrimaryButton
          title={t("cart.open", { defaultValue: "Перейти в корзину" })}
          onPress={openCartPage}
          disabled={!cartReady || currentRoute === "Cart"}
          leftSlot={<Ionicons name="receipt-outline" size={18} color="#FFFFFF" />}
          buttonStyle={styles.cartDrawerButton}
        />
        <PrimaryButton
          title={t("cart.toCalculator", { defaultValue: "Добавить еще" })}
          onPress={openCalculatorFromCart}
          tone="soft"
          leftSlot={<Ionicons name="add-outline" size={18} color={theme.colors.primary} />}
          buttonStyle={styles.cartDrawerButton}
        />
      </View>
    </Card>
  );

  if (desktopNavEnabled) {
    const desktopTop = insets.top + theme.layout.desktopNavGapTop;
    const desktopPopoverTop = desktopTop + theme.layout.desktopNavHeight + spacing.sm;
    const desktopInnerWidth = Math.min(width - spacing.md * 2, theme.layout.maxWidth);
    const desktopPopoverRight = (width - desktopInnerWidth) / 2;
    const desktopCartPopoverHeight = Math.max(320, Math.min(520, height - desktopPopoverTop - spacing.md));

    return (
      <>
        <View style={[styles.desktopRoot, { top: desktopTop }]} pointerEvents="box-none">
          <View style={[styles.desktopInner, { maxWidth: theme.layout.maxWidth }]} pointerEvents="box-none">
            <Card variant={isNavGlass ? "glass" : "solid"} blurIntensity={24} padded={false} elevated style={styles.desktopCard}>
              <View style={styles.desktopContent}>
<View style={styles.desktopBrandRow}>
                  <Image source={require("../../assets/favicon.png")} style={styles.brandLogo as any} resizeMode="contain" />
                  <Text style={styles.desktopBrand} numberOfLines={1}>
                    Канокна | Краснодарский край
                  </Text>
                </View>

                <View style={styles.desktopLinks}>
                  {navItems.map((item) => {
                    const selected = item.route === currentRoute;
                    return (
                      <Pressable
                        key={item.route}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => openRoute(item.route)}
                        hitSlop={6}
                        style={(state) => [
                          styles.desktopLink,
                          selected ? styles.desktopLinkSelected : null,
                          (state as unknown as { hovered?: boolean }).hovered && !selected ? styles.desktopLinkHovered : null,
                          state.pressed ? styles.desktopLinkPressed : null
                        ]}
                      >
                        <Text style={[styles.desktopLinkText, selected ? styles.desktopLinkTextSelected : null]} numberOfLines={1}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.desktopControls}>
                  <View ref={cartTriggerRef}>
                    <IconButton
                      icon="cart-outline"
                      accessibilityLabel={cartTooltip}
                      selected={currentRoute === "Cart" || cartOpen}
                      badgeCount={cartItems.length}
                      onPress={openCart}
                      onHoverIn={onDesktopCartHoverIn}
                      onFocus={onDesktopCartHoverIn}
                      enableTooltip={false}
                      size={42}
                      iconSize={20}
                    />
                  </View>

                  <View ref={accountTriggerRef}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Account"
                      accessibilityState={{ expanded: accountOpen }}
                      onPress={onAccountTriggerPress}
                      onHoverIn={onDesktopAccountHoverIn}
                      onFocus={onDesktopAccountHoverIn}
                      style={(state) => [
                        styles.controlPill,
                        accountOpen ? styles.controlPillActive : null,
                        (state as unknown as { hovered?: boolean }).hovered ? styles.pillHovered : null,
                        state.pressed ? styles.pillPressed : null
                      ]}
                    >
                      <Ionicons name="person-circle-outline" size={20} color={accountOpen ? theme.colors.text : theme.colors.textMuted} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </Card>
          </View>
        </View>

        {accountOpen ? (
          <Animated.View
            ref={accountPanelRef}
            style={[
              styles.accountMenuWrap,
              { top: desktopPopoverTop, right: desktopPopoverRight, width: accountPopoverWidth },
              { opacity: accountPanelOpacity, transform: [{ translateY: accountPanelTranslateY }, { scale: accountPanelScale }] }
            ]}
          >
            {renderAccountCard()}
          </Animated.View>
        ) : null}

        {cartOpen ? (
          <Animated.View
            ref={cartPanelRef}
            style={[
              styles.cartDrawerWrap,
              { top: desktopPopoverTop, right: desktopPopoverRight, width: cartPopoverWidth, height: desktopCartPopoverHeight },
              { opacity: cartPanelOpacity, transform: [{ translateY: cartPanelTranslateY }, { scale: cartPanelScale }] }
            ]}
          >
            {renderCartCard()}
          </Animated.View>
        ) : null}
      </>
    );
  }

  const tabBarBottom = insets.bottom;

  const moreRoutes = new Set(moreItems.map((m) => m.route));
  const isMoreActive = !!(currentRoute && moreRoutes.has(currentRoute));

  return (
    <>
      {currentRoute !== "SupportChat" ? (
        <View
          style={[
            styles.topBar,
            {
              top: 0,
              paddingTop: insets.top,
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.border,
            },
            ...(Platform.OS === "web"
              ? ([
                  {
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    backgroundColor: theme.isDark ? "rgba(22,22,23,0.88)" : "rgba(255,255,255,0.88)"
                  }
                ] as object[])
              : [])
          ]}
        >
          <View style={styles.topBarContent}>
            <View style={styles.topBarBrandRow}>
              <Image source={require("../../assets/favicon.png")} style={styles.brandLogoMobile as any} resizeMode="contain" />
              <Text style={styles.topBarBrand} numberOfLines={1}>
                Канокна
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: moreOpen }}
              accessibilityLabel={t("common.more", { defaultValue: "Ещё" })}
              onPress={toggleMore}
              style={(state) => [
                styles.topBarBurger,
                (state as unknown as { hovered?: boolean }).hovered ? styles.menuPillHovered : null,
                state.pressed ? styles.menuPillPressed : null
              ]}
            >
              <Animated.View style={[styles.burgerIconWrap, { transform: [{ rotateZ: moreIconRotate }] }]}>
                <Animated.View style={[styles.burgerIconLayer, { opacity: moreIconMenuOpacity }]}>
                  <Ionicons name="menu" size={26} color={theme.colors.text} />
                </Animated.View>
                <Animated.View style={[styles.burgerIconLayer, { opacity: moreIconCloseOpacity }]}>
                  <Ionicons name="close" size={26} color={theme.colors.primary} />
                </Animated.View>
              </Animated.View>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.tabBar,
          {
            bottom: tabBarBottom,
            backgroundColor: theme.colors.tabBarBg,
            borderColor: theme.colors.border,
            ...(Platform.OS === "web"
              ? ({
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  backgroundColor: theme.isDark ? "rgba(34,34,37,0.92)" : "rgba(232,232,235,0.92)"
                } as object)
              : null)
          }
        ]}
      >
        {tabItems.map((tab) => {
          const isActive = tab.route === currentRoute;
          const isCart = tab.route === "Cart";
          const iconColor = isActive ? theme.colors.primary : theme.colors.textMuted;
          const iconName = isActive ? tab.activeIcon : tab.icon;

          return (
            <Pressable
              key={tab.route}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
              onPress={() => openRoute(tab.route)}
              style={(state) => [
                styles.tabItem,
                isActive ? styles.tabItemActive : null,
                state.pressed ? styles.tabItemPressed : null
              ]}
            >
              <View style={styles.tabIconWrap}>
                <Ionicons name={iconName} size={22} color={iconColor} />
                {isCart && cartItems.length > 0 ? (
                  <View style={[styles.tabBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.tabBadgeText}>
                      {cartItems.length > 99 ? "99+" : cartItems.length}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: iconColor }
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {moreOpen ? (
        <Animated.View
          style={[
            styles.moreMenuFull,
            {
              backgroundColor: theme.colors.surface,
            },
            {
              opacity: moreSheetOpacity,
              transform: [{ translateX: moreSlideX }]
            }
          ]}
        >
          <View style={styles.moreMenuContent}>
            <View style={[styles.moreMenuList, { paddingTop: insets.top + theme.layout.mobileTopBarHeight + spacing.md }]}>
              {moreItems.map((item) => {
                const selected = item.route === currentRoute;
                return (
                  <MenuItem
                    key={item.route}
                    icon={item.icon}
                    label={item.label}
                    selected={selected}
                    onPress={() => openRoute(item.route)}
                  />
                );
              })}
            </View>

            <View style={[styles.moreMenuSettings, { paddingBottom: insets.bottom + spacing.md }]}>
              <View style={[styles.menuDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.moreMenuSettingsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={themeMenuLabel}
                  onPress={toggleTheme}
                  style={(state) => [
                    styles.settingsPill,
                    { backgroundColor: theme.colors.surface2 },
                    (state as unknown as { hovered?: boolean }).hovered ? styles.settingsPillHovered : null,
                    state.pressed ? styles.settingsPillPressed : null
                  ]}
                >
                  <Ionicons name={themeMenuIcon} size={16} color={theme.colors.primary} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t("common.language", { defaultValue: "Язык" })}: ${languageToggleLabel}`}
                  onPress={() => void setLanguage(nextLang)}
                  style={(state) => [
                    styles.settingsPill,
                    { backgroundColor: theme.colors.surface2 },
                    (state as unknown as { hovered?: boolean }).hovered ? styles.settingsPillHovered : null,
                    state.pressed ? styles.settingsPillPressed : null
                  ]}
                >
                  <Text style={styles.settingsPillLabel}>{languageToggleLabel}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>
      ) : null}
    </>
  );
}

function MenuItem({
  icon,
  label,
  selected,
  onPress,
  tone = "default",
  trailing = "arrow"
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  selected: boolean;
  onPress: () => void;
  tone?: "default" | "danger";
  trailing?: "arrow" | "none";
}): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isDanger = tone === "danger";
  const iconColor = isDanger ? theme.colors.danger : selected ? theme.colors.primary : theme.colors.textMuted;
  const labelColor = isDanger ? theme.colors.danger : selected ? theme.colors.text : theme.colors.text;
  const trailingColor = isDanger ? theme.colors.danger : selected ? theme.colors.primary : theme.colors.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={(state) => [
        styles.menuItem,
        selected ? styles.menuItemSelected : null,
        (state as unknown as { hovered?: boolean }).hovered ? styles.menuItemHovered : null,
        state.pressed ? styles.menuItemPressed : null,
      ]}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconWrap, selected ? styles.menuIconWrapSelected : null, isDanger ? styles.menuIconWrapDanger : null]}>
          <Ionicons name={icon} size={17} color={iconColor} />
        </View>
        <Text style={[styles.menuLabel, { color: labelColor }, selected ? styles.menuLabelSelected : null]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {trailing === "arrow" ? <Ionicons name="arrow-forward" size={16} color={trailingColor} /> : null}
    </Pressable>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    desktopRoot: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 60,
      elevation: 30,
      alignItems: "center",
      paddingHorizontal: spacing.md
    },
    desktopInner: {
      width: "100%",
      alignSelf: "center"
    },
    desktopCard: {
      width: "100%",
      height: theme.layout.desktopNavHeight,
      borderRadius: 16,
      overflow: "hidden"
    },
    desktopContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      gap: spacing.md
    },
    desktopBrand: {
      fontFamily: "Days",
      fontSize: 17,
      letterSpacing: 0,
      color: theme.colors.text
    },
    desktopBrandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexShrink: 0,
    },
    brandLogo: {
      width: 30,
      height: 30,
      borderRadius: 7,
    },
    brandLogoMobile: {
      width: 28,
      height: 28,
      borderRadius: 7,
    },
    desktopLinks: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6
    },
    desktopLink: {
      paddingHorizontal: 14,
      height: 38,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
      ...({ outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object),
      ...({ cursor: "pointer" } as object)
    },
    desktopLinkSelected: {
      backgroundColor: theme.isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"
    },
    desktopLinkHovered: {
      backgroundColor: theme.isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.025)"
    },
    desktopLinkPressed: {
      opacity: 0.92
    },
    desktopLinkText: {
      ...font(700),
      fontSize: 14,
      letterSpacing: 0,
      color: theme.colors.textMuted
    },
    desktopLinkTextSelected: {
      color: theme.colors.text
    },
    desktopControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      flexShrink: 0
    },
    controlPill: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      ...({ outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object),
      ...({ cursor: "pointer" } as object)
    },
    controlPillActive: {
      borderColor: theme.isDark ? "#fafafa" : "#18181b",
      backgroundColor: theme.colors.surface2
    },
    pillHovered: {
      borderColor: theme.isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.15)",
      backgroundColor: theme.colors.surface2
    },
    pillPressed: {
      opacity: 0.92,
      backgroundColor: theme.colors.surface2
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject
    },
    modalRoot: {
      flex: 1
    },
    moreMenuFull: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      width: "100%",
      zIndex: 70,
      elevation: 40,
    },
    moreMenuList: {
      paddingHorizontal: spacing.sm,
      gap: 4
    },
    moreMenuContent: {
      flex: 1,
      justifyContent: "space-between",
    },
    moreMenuSettings: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      gap: spacing.sm,
    },
    moreMenuSettingsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: spacing.sm,
    },
    settingsPill: {
      height: 34,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      ...({ outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object),
      ...({ cursor: "pointer" } as object)
    },
    settingsPillHovered: {
      borderColor: theme.colors.focus
    },
    settingsPillPressed: {
      opacity: 0.92
    },
    settingsPillLabel: {
      ...font(800),
      fontSize: 12,
      letterSpacing: 0,
      color: theme.colors.primary
    },
    accountMenuWrap: {
      position: "absolute",
      ...(theme.shadow.md as object)
    },
    accountMenuCard: {
      width: "100%",
      borderRadius: 8,
      overflow: "hidden",
      paddingVertical: spacing.xs
    },
    accountHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm
    },
    accountHeaderText: {
      flex: 1,
      minWidth: 0,
      gap: 4
    },
    accountHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      flexShrink: 0
    },
    accountActionButton: {
      minWidth: 34,
      height: 34,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      ...({ outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object),
      ...({ cursor: "pointer" } as object)
    },
    accountActionButtonIcon: {
      width: 34,
      paddingHorizontal: 0
    },
    accountActionButtonHovered: {
      borderColor: theme.colors.focus
    },
    accountActionButtonPressed: {
      opacity: 0.96,
      backgroundColor: theme.colors.surface
    },
    accountActionLabel: {
      ...font(800),
      fontSize: 12,
      letterSpacing: 0,
      color: theme.colors.primary
    },
    popoverHeader: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm
    },
    popoverHeaderCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2
    },
    popoverHeaderIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    },
    popoverTitle: {
      ...font(900),
      fontSize: 15,
      color: theme.colors.text
    },
    popoverSubtitle: {
      ...font(700),
      fontSize: 12,
      color: theme.colors.textMuted
    },
    cartDrawerWrap: {
      position: "absolute",
      ...(theme.shadow.md as object)
    },
    cartDrawerCard: {
      width: "100%",
      height: "100%",
      borderRadius: 8,
      overflow: "hidden"
    },
    cartDrawerBody: {
      flex: 1,
      minHeight: 0
    },
    cartDrawerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      gap: spacing.sm
    },
    cartDrawerStateText: {
      ...font(800),
      fontSize: 13,
      textAlign: "center"
    },
    cartDrawerMetaRow: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
      gap: 4
    },
    cartDrawerMetaTitle: {
      ...font(900),
      fontSize: 13
    },
    cartDrawerMetaText: {
      ...font(700),
      fontSize: 12
    },
    cartDrawerScroll: {
      flex: 1
    },
    cartDrawerScrollContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      gap: 6
    },
    cartItemRow: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    cartItemMain: {
      gap: spacing.sm
    },
    cartItemTitle: {
      ...font(800),
      fontSize: 13,
      lineHeight: 18
    },
    cartItemFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm
    },
    cartItemPrice: {
      ...font(900),
      fontSize: 15
    },
    cartDrawerEmpty: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm
    },
    cartDrawerEmptyText: {
      ...font(800),
      fontSize: 13,
      textAlign: "center"
    },
    cartDrawerFooter: {
      borderTopWidth: 1,
      padding: spacing.md,
      gap: spacing.sm
    },
    cartDrawerTotalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm
    },
    cartDrawerTotalLabel: {
      ...font(800),
      fontSize: 13
    },
    cartDrawerTotalValue: {
      ...font(900),
      fontSize: 18
    },
    cartDrawerDisclaimer: {
      fontSize: 12,
      lineHeight: 16,
    },
    cartDrawerButton: {
      width: "100%"
    },
    menuDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginHorizontal: 4
    },
    menuItem: {
      minHeight: 48,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "transparent",
      ...({ outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object),
      ...({ cursor: "pointer" } as object)
    },
    menuItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1
    },
    menuIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: theme.colors.surface2,
      alignItems: "center",
      justifyContent: "center"
    },
    menuIconWrapSelected: {
      backgroundColor: "transparent"
    },
    menuIconWrapDanger: {
      backgroundColor: theme.colors.surface2
    },
    menuLabel: {
      ...font(800),
      fontSize: 14
    },
    menuLabelSelected: {
      color: theme.colors.text
    },
    menuItemSelected: {
      backgroundColor: theme.isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
      borderColor: "transparent"
    },
    menuItemHovered: {
      backgroundColor: theme.isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.025)",
      borderColor: "transparent"
    },
    menuItemPressed: {
      opacity: 0.96
    },
    tabBar: {
      position: "absolute",
      left: 0,
      right: 0,
      height: theme.layout.mobileTabBarHeight,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      borderTopWidth: StyleSheet.hairlineWidth,
      zIndex: 60,
      elevation: 30,
      ...({ outlineStyle: "none" } as object)
    },
    menuPillActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft
    },
    menuPillHovered: {
      borderColor: theme.colors.focus
    },
    menuPillPressed: {
      opacity: 0.96,
      backgroundColor: theme.colors.surface2
    },
    topBar: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 80,
      elevation: 45,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    topBarContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: theme.layout.mobileTopBarHeight,
      paddingHorizontal: spacing.md,
    },
    topBarBrandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    topBarBrand: {
      fontFamily: "Days",
      fontSize: 17,
      letterSpacing: 0,
      color: theme.colors.text
    },
    topBarBurger: {
      width: 52,
      height: 52,
      borderRadius: 8,
      backgroundColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
      ...({ outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object),
      ...({ cursor: "pointer" } as object)
    },
    burgerIconWrap: {
      width: 26,
      height: 26,
      alignItems: "center",
      justifyContent: "center"
    },
    burgerIconLayer: {
      position: "absolute",
      left: 0,
      top: 0,
      width: 26,
      height: 26,
      alignItems: "center",
      justifyContent: "center"
    },
    tabItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      height: theme.layout.mobileTabBarHeight,
      ...({ outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object),
      ...({ cursor: "pointer" } as object)
    },
    tabItemActive: {
    },
    tabItemPressed: {
      opacity: 0.85
    },
    tabIconWrap: {
      position: "relative",
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center"
    },
    tabLabel: {
      ...font(700),
      fontSize: 10,
      letterSpacing: 0.2,
      lineHeight: 12
    },
    tabBadge: {
      position: "absolute",
      top: -4,
      right: -8,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 4,
      alignItems: "center",
      justifyContent: "center"
    },
    tabBadgeText: {
      ...font(800),
      fontSize: 9,
      lineHeight: 12,
      color: "#FFFFFF",
      letterSpacing: 0
    }
  });
}