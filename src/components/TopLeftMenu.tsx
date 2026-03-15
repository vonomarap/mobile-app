import type { ComponentProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { signOut } from "firebase/auth";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme, useThemeControls } from "../theme/ThemeProvider";
import { RootStackParamList, type QuoteOrderItemDraft } from "../navigation/types";
import { useNavGlass } from "../services/scroll-context";
import { useAuth } from "../services/auth-context";
import { useCart } from "../services/cart-context";
import { useCurrencyControls } from "../services/currency-context";
import { auth } from "../services/firebase";
import { LANG_OPTIONS, type LangCode } from "../constants/languages";
import { getCurrentLanguage, setAppLanguage } from "../services/i18n";
import { formatMoney } from "../utils/money";
import { Card } from "./Card";
import { IconButton } from "./IconButton";
import { PrimaryButton } from "./PrimaryButton";

type RouteName = keyof RootStackParamList;

export function TopLeftMenu(): JSX.Element {
  const theme = useTheme();
  const { toggle: toggleTheme } = useThemeControls();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { currency } = useCurrencyControls();
  const { ready: cartReady, items: cartItems, removeItem, itemsSubtotal } = useCart();
  const [visible, setVisible] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const accountProgress = useRef(new Animated.Value(0)).current;
  const cartProgress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<RouteName | undefined>(() => {
    const name = (navigation as any).getCurrentRoute?.()?.name;
    return name as RouteName | undefined;
  });

  const openAccountMenu = () => {
    setLangOpen(false);
    if (accountOpen) return;
    setAccountOpen(true);
    accountProgress.stopAnimation();
    if (reduceMotion) {
      accountProgress.setValue(1);
      return;
    }
    accountProgress.setValue(0);
    Animated.timing(accountProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  };

  const closeAccountMenu = () => {
    if (!accountOpen) return;
    accountProgress.stopAnimation();
    if (reduceMotion) {
      accountProgress.setValue(0);
      setAccountOpen(false);
      return;
    }
    Animated.timing(accountProgress, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) setAccountOpen(false);
    });
  };

  const closeAccountMenuImmediate = () => {
    accountProgress.stopAnimation();
    accountProgress.setValue(0);
    setAccountOpen(false);
  };

  const openCartPanel = () => {
    setLangOpen(false);
    closeAccountMenuImmediate();
    if (cartOpen) return;
    setCartOpen(true);
    cartProgress.stopAnimation();
    if (reduceMotion) {
      cartProgress.setValue(1);
      return;
    }
    cartProgress.setValue(0);
    Animated.timing(cartProgress, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  };

  const closeCartPanel = () => {
    if (!cartOpen) return;
    cartProgress.stopAnimation();
    if (reduceMotion) {
      cartProgress.setValue(0);
      setCartOpen(false);
      return;
    }
    Animated.timing(cartProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) setCartOpen(false);
    });
  };

  const closeCartPanelImmediate = () => {
    cartProgress.stopAnimation();
    cartProgress.setValue(0);
    setCartOpen(false);
  };

  const accountBackdropOpacity = accountProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  const accountPanelOpacity = accountProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  const accountPanelTranslateY = accountProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0]
  });

  const accountPanelScale = accountProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1]
  });

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

  const cartBackdropOpacity = cartProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  const cartPanelOpacity = cartProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  const cartPanelTranslateX = cartProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0]
  });

  const desktopNavEnabled = Platform.OS === "web" && width >= theme.layout.desktopNavMinWidth;
  const isNavGlass = useNavGlass();

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
    if (!desktopNavEnabled) return;
    if (!visible) {
      progress.stopAnimation();
      progress.setValue(0);
      return;
    }
    setVisible(false);
    progress.stopAnimation();
    progress.setValue(0);
  }, [desktopNavEnabled, progress, visible]);

  useEffect(() => {
    setLangOpen(false);
    closeAccountMenuImmediate();
    closeCartPanelImmediate();
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
    // Close temporary overlays when the user starts scrolling on web.
    if (Platform.OS !== "web") return;
    if (!langOpen && !accountOpen && !cartOpen) return;

    const win = (globalThis as any).window as any;
    const doc = (globalThis as any).document as any;
    if (!win || !doc) return;

    const close = () => {
      setLangOpen(false);
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
  }, [accountOpen, cartOpen, langOpen]);

  useEffect(() => {
    if (!visible) return;

    // On web the page can be scrolled even with a transparent modal.
    // Close the menu as soon as the user starts scrolling.
    if (Platform.OS !== "web") return;

    const win = (globalThis as any).window as any;
    const doc = (globalThis as any).document as any;
    if (!win || !doc) return;

    const close = () => closeMenu();

    win.addEventListener?.("wheel", close, { passive: true });
    win.addEventListener?.("touchmove", close, { passive: true });
    doc.addEventListener?.("scroll", close, true);

    return () => {
      win.removeEventListener?.("wheel", close);
      win.removeEventListener?.("touchmove", close);
      doc.removeEventListener?.("scroll", close, true);
    };
  }, [visible, reduceMotion]);

  const styles = useMemo(() => makeStyles(theme), [theme]);
  const top = insets.top + spacing.sm;
  const right = insets.right + spacing.sm;

  const navItems: Array<{ route: RouteName; label: string; icon: ComponentProps<typeof Ionicons>["name"] }> = [
    { route: "Home", label: t("tabs.home"), icon: "home-outline" },
    { route: "Catalog", label: t("tabs.catalog"), icon: "grid-outline" },
    { route: "Gallery", label: t("tabs.gallery"), icon: "images-outline" },
    { route: "Calculator", label: t("tabs.calculator"), icon: "calculator-outline" },
    { route: "Contacts", label: t("tabs.contacts"), icon: "call-outline" }
  ];

  const cartTooltip = cartItems.length ? `${t("cart.open")} (${cartItems.length})` : t("cart.open");
  const currentLang: LangCode = getCurrentLanguage();
  const setLanguage = async (next: LangCode) => {
    setLangOpen(false);
    if (currentLang === next) return;
    await setAppLanguage(next);
  };

  const openRoute = (route: RouteName) => {
    setLangOpen(false);
    closeAccountMenu();
    closeCartPanelImmediate();
    (navigation as any).navigate(route);
  };

  const openCartPage = () => {
    setLangOpen(false);
    closeAccountMenuImmediate();
    closeCartPanelImmediate();
    closeMenuImmediate();

    if (Platform.OS === "web") {
      const location = (globalThis as any).location as
        | { pathname?: string; assign?: (url: string) => void; href?: string }
        | undefined;

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
    if (Platform.OS === "web") {
      openCartPage();
      return;
    }

    if (desktopNavEnabled) {
      closeMenuImmediate();
      if (cartOpen) closeCartPanel();
      else openCartPanel();
      return;
    }

    openCartPage();
  };

  const openCalculatorFromCart = () => {
    setLangOpen(false);
    closeAccountMenuImmediate();
    closeCartPanelImmediate();
    closeMenuImmediate();
    if (currentRoute === "Calculator") return;
    (navigation as any).navigate("Calculator");
  };

  const renderCartItemLabel = (item: QuoteOrderItemDraft, index: number): string => {
    const input = item.calcInput;
    const kind = input.productType === "door" ? t("calculator.types.door") : t("calculator.types.window");
    const widthCm = typeof input.width === "number" && Number.isFinite(input.width) ? Math.round(input.width * 100) : null;
    const heightCm = typeof input.height === "number" && Number.isFinite(input.height) ? Math.round(input.height * 100) : null;
    const qty = typeof input.quantity === "number" && Number.isFinite(input.quantity) ? Math.max(1, Math.round(input.quantity)) : 1;
    const sizeLabel = widthCm && heightCm ? `${widthCm}x${heightCm} cm` : "-";
    return `${index + 1}. ${kind} · ${sizeLabel} · x${qty}`;
  };

  const orderMetaText = t("calculator.orderItemsCount", { defaultValue: "Позиции: {{count}}", count: cartItems.length });

  const onSignOut = async () => {
    setLangOpen(false);
    closeAccountMenu();
    try {
      await signOut(auth);
    } catch (error) {
      console.warn("signOut failed:", error);
    }
  };

  if (desktopNavEnabled) {
    const desktopTop = insets.top + theme.layout.desktopNavGapTop;
    const langMenuTop = desktopTop + theme.layout.desktopNavHeight + spacing.sm;
    const desktopInnerWidth = Math.min(width - spacing.md * 2, theme.layout.maxWidth);
    const desktopMenuRight = (width - desktopInnerWidth) / 2;
    const cartDrawerWidth = Math.min(380, width - spacing.md * 2);

    return (
      <>
        <View style={[styles.desktopRoot, { top: desktopTop }]} pointerEvents="box-none">
          <View style={[styles.desktopInner, { maxWidth: theme.layout.maxWidth }]} pointerEvents="box-none">
            <Card variant={isNavGlass ? "glass" : "solid"} blurIntensity={24} padded={false} elevated style={styles.desktopCard}>
              <View style={styles.desktopContent}>
                <Text style={styles.desktopBrand} numberOfLines={1}>
                  Окна в Каневской
                </Text>

                <View style={styles.desktopLinks}>
                  {navItems.map((item) => {
                    const selected = item.route === currentRoute;

                    return (
                      <Pressable
                        key={item.route}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          if (selected) return;
                          setLangOpen(false);
                          closeAccountMenuImmediate();
                          closeCartPanelImmediate();
                          (navigation as any).navigate(item.route);
                        }}
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
	                  <Pressable
	                    accessibilityRole="button"
	                    accessibilityLabel="Toggle theme"
	                    onPress={() => {
	                      setLangOpen(false);
	                      closeAccountMenuImmediate();
	                      closeCartPanelImmediate();
	                      toggleTheme();
	                    }}
	                    style={(state) => {
	                      const pressed = state.pressed;
	                      const hovered = (state as unknown as { hovered?: boolean }).hovered;

                      return [
                        styles.controlPill,
                        hovered ? styles.pillHovered : null,
                        pressed ? styles.pillPressed : null,
                      ];
                    }}
                  >
                    <Ionicons
                      name={theme.isDark ? "moon-outline" : "sunny-outline"}
                      size={18}
                      color={theme.colors.primary}
                    />
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Language"
                    accessibilityState={{ expanded: langOpen }}
                    onPress={() => {
                      closeAccountMenuImmediate();
                      closeCartPanelImmediate();
                      setLangOpen((v) => !v);
                    }}
                    style={(state) => {
                      const pressed = state.pressed;
                      const hovered = (state as unknown as { hovered?: boolean }).hovered;

                      return [
                        styles.controlPill,
                        hovered ? styles.pillHovered : null,
                        pressed ? styles.pillPressed : null,
                      ];
                    }}
	                  >
	                    <Ionicons name="language-outline" size={18} color={theme.colors.primary} />
	                  </Pressable>


                  <IconButton
                    icon="cart-outline"
                    accessibilityLabel={cartTooltip}
                    selected={currentRoute === "Cart" || cartOpen}
                    badgeCount={cartItems.length}
                    onPress={openCart}
                  />

	                  <Pressable
	                    accessibilityRole="button"
	                    accessibilityLabel="Account"
	                    accessibilityState={{ expanded: accountOpen }}
	                    onPress={() => {
	                      setLangOpen(false);
	                      closeCartPanelImmediate();
	                      if (accountOpen) closeAccountMenu();
	                      else openAccountMenu();
	                    }}
	                    style={(state) => {
	                      const pressed = state.pressed;
	                      const hovered = (state as unknown as { hovered?: boolean }).hovered;

	                      return [
	                        styles.controlPill,
	                        hovered ? styles.pillHovered : null,
	                        pressed ? styles.pillPressed : null,
	                      ];
	                    }}
	                  >
	                    <Ionicons name="person-circle-outline" size={18} color={theme.colors.primary} />
	                  </Pressable>
	                </View>
	              </View>
	            </Card>
          </View>
        </View>

        <Modal
          transparent
          animationType="fade"
          visible={langOpen}
          onRequestClose={() => setLangOpen(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable style={styles.backdropPress} onPress={() => setLangOpen(false)} />
	            <View style={[styles.langDesktopMenuWrap, { top: langMenuTop, right: desktopMenuRight }]}>
	              <Card variant="solid" padded={false} elevated style={styles.langMenuCard}>
	                {LANG_OPTIONS.map((opt, idx) => (
	                  <LanguageMenuItem
	                    key={opt.code}
                    label={opt.label}
                    selected={currentLang === opt.code}
                    showDivider={idx !== 0}
                    onPress={() => void setLanguage(opt.code)}
                  />
                ))}
              </Card>
            </View>
          </View>
	        </Modal>

	        <Modal transparent animationType="none" visible={accountOpen} onRequestClose={() => closeAccountMenu()}>
	          <View style={styles.modalRoot}>
	            <Animated.View
	              pointerEvents="none"
	              style={[
	                styles.backdrop,
	                {
	                  opacity: accountBackdropOpacity,
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
	            <Pressable style={styles.backdropPress} onPress={() => closeAccountMenu()} />
	            <Animated.View
	              style={[
	                styles.accountMenuWrap,
	                { top: langMenuTop, right: desktopMenuRight },
	                {
	                  opacity: accountPanelOpacity,
	                  transform: [{ translateY: accountPanelTranslateY }, { scale: accountPanelScale }]
	                }
	              ]}
	            >
	              <Card variant="glass" blurIntensity={24} padded={false} elevated={false} style={styles.accountMenuCard}>
	                {user ? (
	                  <Animated.View
	                    style={{
	                      opacity: accountHeaderOpacity,
	                      transform: [{ translateY: accountHeaderTranslateY }]
	                    }}
	                  >
	                    <View style={styles.accountHeader}>
	                      <View style={[styles.accountAvatar, { backgroundColor: theme.colors.primarySoft }]}>
	                        <Text style={[styles.accountAvatarText, { color: theme.colors.primary }]}>
	                          {(user.email?.[0] ?? "U").toUpperCase()}
	                        </Text>
	                      </View>
	                      <View style={styles.accountHeaderText}>
	                        <Text style={styles.accountEmail} numberOfLines={1}>
	                          {user.email}
	                        </Text>
	                      </View>
	                    </View>
	                    <View style={styles.menuDivider} />
	                  </Animated.View>
	                ) : null}

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
	                    <View style={styles.menuDivider} />
	                    <MenuItem
	                      icon="log-out-outline"
	                      label={t("common.signOut")}
	                      selected={false}
	                      onPress={() => void onSignOut()}
	                    />
	                  </Animated.View>
	                ) : null}
	              </Card>
	            </Animated.View>
	          </View>
	        </Modal>

        <Modal transparent animationType="none" visible={cartOpen} onRequestClose={() => closeCartPanel()}>
          <View style={styles.modalRoot}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.backdrop,
                {
                  opacity: cartBackdropOpacity,
                  backgroundColor: theme.isDark ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.16)",
                },
                Platform.OS === "web"
                  ? ({
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)"
                    } as object)
                  : null
              ]}
            />
            <Pressable style={styles.backdropPress} onPress={() => closeCartPanel()} />
            <Animated.View
              style={[
                styles.cartDrawerWrap,
                { top: langMenuTop, right: desktopMenuRight, bottom: spacing.md, width: cartDrawerWidth },
                {
                  opacity: cartPanelOpacity,
                  transform: [{ translateX: cartPanelTranslateX }]
                }
              ]}
            >
              <Card variant="glass" blurIntensity={24} padded={false} elevated={false} style={styles.cartDrawerCard}>
                <View style={styles.cartDrawerHeader}>
                  <View style={[styles.cartDrawerHeaderIcon, { backgroundColor: theme.colors.primarySoft }]}>
                    <Ionicons name="cart-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.cartDrawerHeaderCopy}>
                    <Text style={styles.cartDrawerTitle} numberOfLines={1}>
                      {t("cart.title", { defaultValue: "Корзина" })}
                    </Text>
                    <Text style={styles.cartDrawerSubtitle} numberOfLines={1}>
                      {t("cart.subtitle", { defaultValue: "Изделия для общей заявки" })}
                    </Text>
                  </View>
                  <IconButton
                    icon="close-outline"
                    accessibilityLabel={t("common.close")}
                    onPress={closeCartPanel}
                    tone="soft"
                    size={36}
                    iconSize={16}
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
                                  {renderCartItemLabel(item, index)}
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
                      {t("quotes.details.fields.subtotal", { defaultValue: "Подытог" })}
                    </Text>
                    <Text style={[styles.cartDrawerTotalValue, { color: theme.colors.text }]}>
                      {formatMoney(itemsSubtotal, currency)}
                    </Text>
                  </View>

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
            </Animated.View>
          </View>
        </Modal>
	      </>
	    );
	  }

		  const openMenu = () => {
		    closeAccountMenuImmediate();
		    setVisible(true);
		    progress.stopAnimation();
		    Animated.timing(progress, {
		      toValue: 1,
      duration: reduceMotion ? 0 : 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  };

		  const closeMenu = () => {
		    setLangOpen(false);
		    closeAccountMenuImmediate();
		    progress.stopAnimation();
		    Animated.timing(progress, {
		      toValue: 0,
	      duration: reduceMotion ? 0 : 200,
	      easing: Easing.in(Easing.cubic),
	      useNativeDriver: true
	    }).start(({ finished }) => {
	      if (finished) setVisible(false);
	    });
	  };

	  const closeMenuImmediate = () => {
	    setLangOpen(false);
	    progress.stopAnimation();
	    progress.setValue(0);
	    setVisible(false);
	  };

	  const navigateTo = (route: RouteName) => {
	    closeMenu();
	    if (route === currentRoute) return;
	    (navigation as any).navigate(route);
  };

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  const panelOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  const panelTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0]
  });

  const panelScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1]
  });

  const iconRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"]
  });

  const iconMenuOpacity = progress.interpolate({
    inputRange: [0, 0.4],
    outputRange: [1, 0],
    extrapolate: "clamp"
  });

	  const iconCloseOpacity = progress.interpolate({
	    inputRange: [0.15, 1],
	    outputRange: [0, 1],
	    extrapolate: "clamp"
	  });

	  const accountMenuRight = right + 48 + spacing.sm;

	  return (
	    <>
	      <View style={[styles.root, { top, right }]} pointerEvents="box-none">
	        <IconButton
	          icon="cart-outline"
	          accessibilityLabel={cartTooltip}
	          selected={currentRoute === "Cart"}
	          badgeCount={cartItems.length}
	          onPress={openCart}
	          size={48}
	          iconSize={24}
	        />

	        <Pressable
	          accessibilityRole="button"
	          accessibilityLabel="Account"
	          accessibilityState={{ expanded: accountOpen }}
	          onPress={() => {
	            setLangOpen(false);
	            if (visible) closeMenuImmediate();
	            if (accountOpen) closeAccountMenu();
	            else openAccountMenu();
	          }}
	          style={(state) => {
	            const pressed = state.pressed;
	            const hovered = (state as unknown as { hovered?: boolean }).hovered;

	            return [
	              styles.pill,
	              hovered ? styles.pillHovered : null,
	              pressed ? styles.pillPressed : null,
	            ];
	          }}
	        >
	          <Ionicons name="person-circle-outline" size={26} color={theme.colors.text} />
	        </Pressable>

	        <Pressable
	          accessibilityRole="button"
	          accessibilityLabel="Menu"
	          onPress={() => (visible ? closeMenu() : openMenu())}
	          style={(state) => {
	            const pressed = state.pressed;
	            const hovered = (state as unknown as { hovered?: boolean }).hovered;

	            return [
	              styles.pill,
	              hovered ? styles.pillHovered : null,
	              pressed ? styles.pillPressed : null,
	            ];
	          }}
	        >
	          <Animated.View style={[styles.iconWrap, { transform: [{ rotateZ: iconRotate }] }]}>
	            <Animated.View style={[styles.iconLayer, { opacity: iconMenuOpacity }]}>
	              <Ionicons name="menu" size={24} color={theme.colors.text} />
	            </Animated.View>
	            <Animated.View style={[styles.iconLayer, { opacity: iconCloseOpacity }]}>
	              <Ionicons name="close" size={24} color={theme.colors.text} />
	            </Animated.View>
	          </Animated.View>
	        </Pressable>
	      </View>

		      <Modal transparent animationType="none" visible={accountOpen} onRequestClose={() => closeAccountMenu()}>
		        <View style={styles.modalRoot}>
		          <Animated.View
		            pointerEvents="none"
		            style={[
		              styles.backdrop,
		              {
		                opacity: accountBackdropOpacity,
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
		          <Pressable style={styles.backdropPress} onPress={() => closeAccountMenu()} />
		          <Animated.View
		            style={[
		              styles.accountMenuWrap,
		              { top: top + 44, right: accountMenuRight },
		              {
		                opacity: accountPanelOpacity,
		                transform: [{ translateY: accountPanelTranslateY }, { scale: accountPanelScale }]
		              }
		            ]}
		          >
		            <Card variant="glass" blurIntensity={24} padded={false} elevated={false} style={styles.accountMenuCard}>
		              {user ? (
		                <Animated.View
		                  style={{
		                    opacity: accountHeaderOpacity,
		                    transform: [{ translateY: accountHeaderTranslateY }]
		                  }}
		                >
		                  <View style={styles.accountHeader}>
		                    <View style={[styles.accountAvatar, { backgroundColor: theme.colors.primarySoft }]}>
		                      <Text style={[styles.accountAvatarText, { color: theme.colors.primary }]}>
		                        {(user.email?.[0] ?? "U").toUpperCase()}
		                      </Text>
		                    </View>
		                    <View style={styles.accountHeaderText}>
		                      <Text style={styles.accountEmail} numberOfLines={1}>
		                        {user.email}
		                      </Text>
		                    </View>
		                  </View>
		                  <View style={styles.menuDivider} />
		                </Animated.View>
		              ) : null}

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
		                  <View style={styles.menuDivider} />
		                  <MenuItem
		                    icon="log-out-outline"
		                    label={t("common.signOut")}
		                    selected={false}
		                    onPress={() => void onSignOut()}
		                  />
		                </Animated.View>
		              ) : null}
		            </Card>
		          </Animated.View>
		        </View>
		      </Modal>

      <Modal transparent animationType="none" visible={visible} onRequestClose={() => closeMenu()}>
        <View style={styles.modalRoot}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.backdrop,
              {
                opacity: backdropOpacity,
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
          <Pressable style={styles.backdropPress} onPress={() => closeMenu()} />
          <Animated.View
            style={[
              styles.menuWrap,
              { top: top + 44, right },
              {
                opacity: panelOpacity,
                transform: [{ translateY: panelTranslateY }, { scale: panelScale }]
              }
            ]}
          >
            <Card variant="glass" blurIntensity={24} padded={false} elevated={false} style={styles.menuCard}>
              <View style={styles.brandRow}>
                <View style={[styles.brandIcon, { backgroundColor: theme.colors.primarySoft }]}>
                  <Ionicons name="grid-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.brandText}>
                  <Text style={styles.brandName} numberOfLines={1}>
                    Окна в Каневской
                  </Text>
                  <Text style={styles.brandSubtitle} numberOfLines={1}>
                    {t("common.menu")}
                  </Text>
                </View>
              </View>
              <View style={styles.menuDivider} />
              <Animated.View
                style={[
                  styles.menuControls,
                  {
                    opacity: progress.interpolate({ inputRange: [0.08, 1], outputRange: [0, 1], extrapolate: "clamp" }),
                    transform: [
                      {
                        translateY: progress.interpolate({
                          inputRange: [0.08, 1],
                          outputRange: [6, 0],
                          extrapolate: "clamp"
                        })
                      }
                    ]
                  }
                ]}
	              >
	                <View style={styles.menuControlsRow}>
	                  <Pressable
	                    accessibilityRole="button"
	                    accessibilityLabel="Toggle theme"
                    onPress={toggleTheme}
                    style={(state) => {
                      const pressed = state.pressed;
                      const hovered = (state as unknown as { hovered?: boolean }).hovered;

                      return [
                        styles.controlPill,
                        hovered ? styles.pillHovered : null,
                        pressed ? styles.pillPressed : null,
                      ];
                    }}
                  >
                    <Ionicons
                      name={theme.isDark ? "moon-outline" : "sunny-outline"}
                      size={18}
	                      color={theme.colors.primary}
	                    />
	                  </Pressable>
	                  <Pressable
	                    accessibilityRole="button"
		                    accessibilityLabel="Language"
		                    accessibilityState={{ expanded: langOpen }}
		                    onPress={() => {
		                      closeAccountMenuImmediate();
		                      setLangOpen((v) => !v);
		                    }}
	                    style={(state) => {
	                      const pressed = state.pressed;
	                      const hovered = (state as unknown as { hovered?: boolean }).hovered;

	                      return [
	                        styles.controlPill,
	                        hovered ? styles.pillHovered : null,
	                        pressed ? styles.pillPressed : null,
	                      ];
	                    }}
	                  >
	                    <Ionicons name="language-outline" size={18} color={theme.colors.primary} />
	                  </Pressable>
	                </View>
	                {langOpen ? (
	                  <Card
	                    variant="solid"
	                    padded={false}
	                    elevated={false}
	                    style={styles.langInlineMenuCard}
	                  >
	                    {LANG_OPTIONS.map((opt, idx) => (
	                      <LanguageMenuItem
	                        key={opt.code}
	                        label={opt.label}
	                        selected={currentLang === opt.code}
	                        showDivider={idx !== 0}
	                        onPress={() => void setLanguage(opt.code)}
	                      />
	                    ))}
	                  </Card>
	                ) : null}
	              </Animated.View>
              <View style={styles.menuDivider} />
              {navItems.map((item, idx) => {
                const start = 0.10 + idx * 0.04;
                const itemOpacity = progress.interpolate({
                  inputRange: [start, 1],
                  outputRange: [0, 1],
                  extrapolate: "clamp"
                });
                const itemTranslateX = progress.interpolate({
                  inputRange: [start, 1],
                  outputRange: [8, 0],
                  extrapolate: "clamp"
                });

                return (
                  <Animated.View
                    key={item.route}
                    style={{ opacity: itemOpacity, transform: [{ translateX: itemTranslateX }] }}
                  >
                    <MenuItem
                      icon={item.icon}
                      label={item.label}
                      selected={item.route === currentRoute}
                      onPress={() => navigateTo(item.route)}
                    />
                  </Animated.View>
                );
              })}
            </Card>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

function MenuItem({
  icon,
  label,
  selected,
  onPress
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  selected: boolean;
  onPress: () => void;
}): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={(state) => {
        const pressed = state.pressed;
        const hovered = (state as unknown as { hovered?: boolean }).hovered;

        return [
          styles.menuItem,
          selected ? styles.menuItemSelected : null,
          hovered ? styles.menuItemHovered : null,
          pressed ? styles.menuItemPressed : null,
        ];
      }}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconWrap, { backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface2 }]}>
          <Ionicons name={icon} size={18} color={selected ? theme.colors.primary : theme.colors.text} />
        </View>
        <Text style={[styles.menuLabel, { color: theme.colors.text }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {selected ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
    </Pressable>
  );
}

function LanguageMenuItem({
  label,
  selected,
  showDivider,
  onPress
}: {
  label: string;
  selected: boolean;
  showDivider: boolean;
  onPress: () => void;
}): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={(state) => {
        const pressed = state.pressed;
        const hovered = (state as unknown as { hovered?: boolean }).hovered;
        const focused = (state as unknown as { focused?: boolean }).focused;

        return [
          styles.langItem,
          showDivider ? styles.langItemDivider : null,
          hovered ? styles.langItemHovered : null,
          pressed ? styles.langItemPressed : null,
          focused ? styles.langItemFocused : null
        ];
      }}
    >
      <Text style={styles.langItemLabel}>{label}</Text>
      {selected ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
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
      ...font(900),
      fontSize: 15,
      letterSpacing: 0.2,
      color: theme.colors.text
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
      paddingHorizontal: 12,
      height: 36,
      borderRadius: 999,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "transparent",
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object )
    },
    desktopLinkSelected: {
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.border
    },
    desktopLinkHovered: {
      backgroundColor: theme.colors.surface2,
      borderColor: theme.colors.border
    },
    desktopLinkPressed: {
      opacity: 0.92
    },
    desktopLinkText: {
      ...font(900),
      fontSize: 13,
      letterSpacing: 0.25,
      color: theme.colors.textMuted
    },
	    desktopLinkTextSelected: {
	      color: theme.colors.primary
	    },
	    desktopControls: {
	      flexDirection: "row",
	      alignItems: "center",
	      gap: spacing.sm,
	      flexShrink: 0
	    },
    root: {
      position: "absolute",
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      zIndex: 50,
      elevation: 20
    },
    pill: {
      width: 48,
      height: 48,
      borderRadius: 999,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      // Remove browser focus ring/outline on web after click/tap.
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object ),
      ...(theme.shadow.sm as object)
    },
    iconWrap: {
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center"
    },
    iconLayer: {
      position: "absolute",
      left: 0,
      top: 0
    },
    pillHovered: {
      opacity: 0.98
    },
    pillPressed: {
      opacity: 0.92
    },
    modalRoot: {
      flex: 1
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject
    },
    backdropPress: {
      ...StyleSheet.absoluteFillObject,
    },
    menuWrap: {
      position: "absolute",
      width: 260,
      ...(theme.shadow.md as object)
    },
    menuCard: {
      width: "100%",
      borderRadius: 16,
      overflow: "hidden"
    },
    brandRow: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    brandIcon: {
      width: 38,
      height: 38,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center"
    },
    brandText: {
      flex: 1,
      minWidth: 0,
      gap: 2
    },
    brandName: {
      ...font(900),
      fontSize: 14,
      letterSpacing: 0.2,
      color: theme.colors.text
    },
    brandSubtitle: {
      ...font(900),
      fontSize: 12,
      letterSpacing: 0.3,
      color: theme.colors.textMuted
    },
    menuTitle: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      ...font(900),
      fontSize: 13,
      letterSpacing: 0.3,
      color: theme.colors.textMuted
    },
    menuControls: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm
    },
    menuControlsRow: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      justifyContent: "space-between"
    },
    langDesktopMenuWrap: {
      position: "absolute",
      width: 220,
      ...(theme.shadow.md as object)
    },
    langMenuCard: {
      width: "100%",
      borderRadius: 16,
      overflow: "hidden"
    },
    langInlineMenuCard: {
      width: "100%",
      marginTop: spacing.sm,
      borderRadius: 16,
      overflow: "hidden"
    },
    langItem: {
      minHeight: 46,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: "transparent",
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object )
    },
    langItemDivider: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border
    },
    langItemLabel: {
      ...font(800),
      fontSize: 14,
      color: theme.colors.text
    },
    langItemHovered: {
      backgroundColor: theme.colors.surface2
    },
    langItemPressed: {
      opacity: 0.9
    },
    langItemFocused: {
      borderColor: theme.colors.focus
    },
    cartDrawerWrap: {
      position: "absolute",
      ...(theme.shadow.md as object)
    },
    cartDrawerCard: {
      width: "100%",
      height: "100%",
      borderRadius: 22,
      overflow: "hidden"
    },
    cartDrawerHeader: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    cartDrawerHeaderIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center"
    },
    cartDrawerHeaderCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2
    },
    cartDrawerTitle: {
      ...font(900),
      fontSize: 16,
      color: theme.colors.text
    },
    cartDrawerSubtitle: {
      ...font(700),
      fontSize: 12,
      color: theme.colors.textMuted
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
      gap: spacing.sm
    },
    cartItemRow: {
      borderWidth: 1,
      borderRadius: 16,
      padding: spacing.sm
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
      borderRadius: 16,
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
    cartDrawerButton: {
      width: "100%"
    },
    accountMenuWrap: {
      position: "absolute",
      width: 280,
      ...(theme.shadow.md as object)
    },
    accountMenuCard: {
      width: "100%",
      borderRadius: 16,
      overflow: "hidden"
    },
    accountHeader: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    accountAvatar: {
      width: 36,
      height: 36,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center"
    },
    accountAvatarText: {
      ...font(900),
      fontSize: 14,
      letterSpacing: 0.2
    },
    accountHeaderText: {
      flex: 1,
      minWidth: 0
    },
    accountEmail: {
      ...font(900),
      fontSize: 13,
      letterSpacing: 0.2,
      color: theme.colors.text
    },
    controlPill: {
      width: 36,
      height: 36,
      borderRadius: 999,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object )
    },
    currencyToggle: {
      flexDirection: "row",
      borderRadius: 999,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface2
    },
    currencyOption: {
      width: 40,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object )
    },
    currencyOptionSelected: {
      backgroundColor: theme.colors.primarySoft
    },
    currencyOptionPressed: {
      opacity: 0.9
    },
    currencyText: {
      ...font(900),
      fontSize: 13,
      color: theme.colors.textMuted
    },
    currencyTextSelected: {
      color: theme.colors.primary
    },
    menuDivider: {
      height: 1,
      backgroundColor: theme.colors.border
    },
    menuItem: {
      minHeight: 52,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: "transparent",
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object )
    },
    menuItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      flex: 1
    },
    menuIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center"
    },
    menuLabel: {
      ...font(800),
      fontSize: 14,
    },
    menuItemSelected: {
      backgroundColor: theme.colors.surface2
    },
    menuItemHovered: {
      backgroundColor: theme.colors.surface2
    },
    menuItemPressed: {
      opacity: 0.9
    },
  });
}
