import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, View, ViewStyle } from "react-native";

type ImageSize = { width: number; height: number };

type WithImage = {
  id: string;
  imageUrl?: string | null | undefined;
};

type ColumnItem<ItemT> = {
  item: ItemT;
  imageHeight: number;
};

type Column<ItemT> = {
  height: number;
  items: Array<ColumnItem<ItemT>>;
};

export function MasonryGrid<ItemT extends WithImage>({
  items,
  numColumns,
  gap,
  columnWidth,
  style,
  defaultImageAspect = 0.75,
  minImageHeight = 160,
  maxImageHeight = 360,
  maxConcurrentSizeRequests = 6,
  estimateItemHeight,
  renderItem,
}: {
  items: ItemT[];
  numColumns: number;
  gap: number;
  columnWidth: number;
  style?: ViewStyle;
  defaultImageAspect?: number;
  minImageHeight?: number;
  maxImageHeight?: number;
  maxConcurrentSizeRequests?: number;
  estimateItemHeight?: (item: ItemT, imageHeight: number) => number;
  renderItem: (args: { item: ItemT; imageHeight: number; columnWidth: number }) => ReactNode;
}): JSX.Element {
  const sizeByUrlRef = useRef<Map<string, ImageSize>>(new Map());
  const [sizeVersion, setSizeVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const urls = items
      .map((item) => (item.imageUrl ? String(item.imageUrl) : ""))
      .filter((url) => url);

    const missing = urls.filter((url) => !sizeByUrlRef.current.has(url));
    if (!missing.length) return () => undefined;

    const concurrency = Math.max(1, Math.min(maxConcurrentSizeRequests, missing.length));
    let nextIndex = 0;

    const fetchOne = (url: string) =>
      new Promise<void>((resolve) => {
        Image.getSize(
          url,
          (width, height) => {
            sizeByUrlRef.current.set(url, { width, height });
            resolve();
          },
          () => {
            sizeByUrlRef.current.set(url, { width: 4, height: 3 });
            resolve();
          }
        );
      });

    const runWorker = async () => {
      while (!cancelled) {
        const url = missing[nextIndex];
        nextIndex += 1;
        if (!url) return;
        await fetchOne(url);
        if (cancelled) return;
        setSizeVersion((v) => v + 1);
      }
    };

    for (let i = 0; i < concurrency; i += 1) {
      void runWorker();
    }

    return () => {
      cancelled = true;
    };
  }, [items, maxConcurrentSizeRequests]);

  const columns = useMemo((): Array<Column<ItemT>> => {
    const clampedColumns = Math.max(1, Math.floor(numColumns));
    const out: Array<Column<ItemT>> = Array.from({ length: clampedColumns }, () => ({ height: 0, items: [] }));

    const getImageHeight = (item: ItemT): number => {
      const url = item.imageUrl ? String(item.imageUrl) : "";
      const size = url ? sizeByUrlRef.current.get(url) : undefined;
      const ratio =
        size && size.width > 0 && size.height > 0 ? size.height / size.width : defaultImageAspect;
      const raw = columnWidth * ratio;
      const clamped = Math.max(minImageHeight, Math.min(maxImageHeight, raw));
      return Number.isFinite(clamped) ? clamped : minImageHeight;
    };

    const estimate = estimateItemHeight ?? ((_: ItemT, imageHeight: number) => imageHeight);

    for (const item of items) {
      const imageHeight = getImageHeight(item);
      const estimatedHeight = estimate(item, imageHeight);

      let bestIndex = 0;
      let bestHeight = out[0]?.height ?? 0;
      for (let i = 1; i < out.length; i += 1) {
        const h = out[i]!.height;
        if (h < bestHeight) {
          bestHeight = h;
          bestIndex = i;
        }
      }

      out[bestIndex]!.items.push({ item, imageHeight });
      out[bestIndex]!.height += estimatedHeight + gap;
    }

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnWidth, defaultImageAspect, estimateItemHeight, gap, items, maxImageHeight, minImageHeight, numColumns, sizeVersion]);

  return (
    <View style={[styles.row, { gap }, style]}>
      {columns.map((col, colIndex) => (
        <View key={`col-${colIndex}`} style={[styles.col, { gap }]}>
          {col.items.map(({ item, imageHeight }) => (
            <View key={item.id} style={styles.item}>
              {renderItem({ item, imageHeight, columnWidth })}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  col: {
    flex: 1,
  },
  item: {
    width: "100%",
  },
});

