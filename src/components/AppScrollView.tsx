import { forwardRef, useCallback, useEffect } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollViewProps } from "react-native";
import { Platform, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { useNavGlassControls } from "../services/scroll-context";
import { useTheme } from "../theme/ThemeProvider";

type Props = ScrollViewProps & {
  trackNavGlass?: boolean;
};

export const AppScrollView = forwardRef<ScrollView, Props>(function AppScrollView({
  trackNavGlass = false,
  onScroll,
  scrollEventThrottle,
  contentContainerStyle,
  style,
  ...rest
}: Props, ref): JSX.Element {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { setScrollY } = useNavGlassControls();

  const desktopNavEnabled = Platform.OS === "web" && width >= theme.layout.desktopNavMinWidth;
  const desktopNavOffset = desktopNavEnabled
    ? theme.layout.desktopNavHeight + theme.layout.desktopNavGapTop + theme.layout.desktopNavGapBottom
    : 0;

  const flattened = StyleSheet.flatten(contentContainerStyle) as { paddingTop?: number } | undefined;
  const existingPaddingTop = typeof flattened?.paddingTop === "number" ? flattened.paddingTop : 0;

  const baseContentContainerStyle = [{ flexGrow: 1 }, contentContainerStyle] as any;

  const nextContentContainerStyle = desktopNavOffset
    ? [baseContentContainerStyle, { paddingTop: existingPaddingTop + desktopNavOffset }]
    : baseContentContainerStyle;

  useEffect(() => {
    if (!trackNavGlass) return;
    if (Platform.OS !== "web") return;
    setScrollY(0);
  }, [setScrollY, trackNavGlass]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (trackNavGlass && Platform.OS === "web") {
      setScrollY(event.nativeEvent?.contentOffset?.y ?? 0);
    }
    onScroll?.(event);
  }, [onScroll, setScrollY, trackNavGlass]);

  const mergedStyle = style ? [{ flex: 1 }, style as any] : styles.flex;

  return (
    <ScrollView
      ref={ref}
      {...rest}
      style={mergedStyle}
      contentContainerStyle={nextContentContainerStyle}
      onScroll={trackNavGlass ? handleScroll : onScroll}
      scrollEventThrottle={trackNavGlass && Platform.OS === "web" ? (scrollEventThrottle ?? 16) : scrollEventThrottle}
    />
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
