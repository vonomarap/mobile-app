import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import type { GalleryItem } from "../services/storefront";

type Props = {
  visible: boolean;
  item: GalleryItem | null;
  initialIndex: number;
  onClose: () => void;
};

export function ImageLightbox({ visible, item, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const panY = useRef(new Animated.Value(0));
  const bgOpacity = useRef(new Animated.Value(1));

  const images = useMemo(() => {
    if (!item) return [];
    const fromList = Array.isArray(item.images)
      ? item.images.filter((url) => typeof url === "string" && url.trim())
      : [];
    if (fromList.length) return fromList;
    const fallback = item.imageUrl ? String(item.imageUrl).trim() : "";
    return fallback ? [fallback] : [];
  }, [item]);

  const total = images.length;

  useEffect(() => {
    if (visible) {
      setIndex(Math.min(initialIndex, Math.max(total - 1, 0)));
      panY.current.setValue(0);
      bgOpacity.current.setValue(1);
    }
  }, [visible, initialIndex, total]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gs) =>
          gs.dy > 8 && gs.dy > Math.abs(gs.dx) * 1.5,
        onPanResponderMove: (_, gs) => {
          const dy = Math.max(0, gs.dy);
          panY.current.setValue(dy);
          bgOpacity.current.setValue(Math.max(0.15, 1 - dy / 400));
        },
        onPanResponderRelease: (_, gs) => {
          if (gs.dy > 120 || gs.vy > 0.6) {
            const { height: screenHeight } = Dimensions.get("window");
            Animated.parallel([
              Animated.timing(panY.current, {
                toValue: screenHeight,
                duration: 180,
                useNativeDriver: false,
              }),
              Animated.timing(bgOpacity.current, {
                toValue: 0,
                duration: 180,
                useNativeDriver: false,
              }),
            ]).start(() => {
              onClose();
            });
          } else {
            Animated.parallel([
              Animated.spring(panY.current, {
                toValue: 0,
                useNativeDriver: false,
              }),
              Animated.spring(bgOpacity.current, {
                toValue: 1,
                useNativeDriver: false,
              }),
            ]).start();
          }
        },
      }),
    [onClose]
  );

  const goPrev = useCallback(
    () => setIndex((i) => (i - 1 + total) % total),
    [total]
  );
  const goNext = useCallback(
    () => setIndex((i) => (i + 1) % total),
    [total]
  );

  if (!visible || !item) return null;

  const currentUrl = images[index] ?? "";
  const hasMultiple = total > 1;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      hardwareAccelerated
      statusBarTranslucent
    >
      <StatusBar hidden />
      <Animated.View
        style={[styles.container, { opacity: bgOpacity.current }]}
      >
        <Animated.View
          style={[
            styles.imageWrap,
            { transform: [{ translateY: panY.current }] },
          ]}
          {...panResponder.panHandlers}
        >
          {currentUrl ? (
            <Image
              source={{ uri: currentUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : null}
        </Animated.View>

        <Pressable
          onPress={onClose}
          style={[styles.closeBtn, { top: insets.top + spacing.sm }]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>

        {hasMultiple && (
          <>
            <Pressable
              onPress={goPrev}
              style={[styles.arrow, styles.arrowLeft]}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel="Previous photo"
            >
              <View style={styles.arrowBg}>
                <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
              </View>
            </Pressable>
            <Pressable
              onPress={goNext}
              style={[styles.arrow, styles.arrowRight]}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel="Next photo"
            >
              <View style={styles.arrowBg}>
                <Ionicons
                  name="chevron-forward"
                  size={28}
                  color="#FFFFFF"
                />
              </View>
            </Pressable>
          </>
        )}

        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom + spacing.sm, spacing.lg) },
          ]}
        >
          {hasMultiple && (
            <Text style={styles.counterText}>
              {index + 1} / {total}
            </Text>
          )}
          {item.title ? (
            <Text style={styles.descTitle} numberOfLines={2}>
              {item.title}
            </Text>
          ) : null}
          {(item.projectType || item.city) ? (
            <View style={styles.metaRow}>
              {item.projectType ? (
                <Text style={styles.metaText}>{item.projectType}</Text>
              ) : null}
              {item.projectType && item.city ? (
                <Text style={styles.metaDot}>•</Text>
              ) : null}
              {item.city ? (
                <View style={styles.cityRow}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color="rgba(255,255,255,0.7)"
                  />
                  <Text style={styles.metaText}>{item.city}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  imageWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  closeBtn: {
    position: "absolute",
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    zIndex: 3,
  },
  arrowLeft: {
    left: spacing.md,
  },
  arrowRight: {
    right: spacing.md,
  },
  arrowBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  counterText: {
    ...font(600),
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 6,
  },
  descTitle: {
    ...font(700),
    fontSize: 18,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  metaDot: {
    ...font(900),
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});