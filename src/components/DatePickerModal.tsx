import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "./Card";
import { PrimaryButton } from "./PrimaryButton";

type Lang = "ru" | "en";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoDateLocal(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseIsoDateLocal(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function firstDayOffsetMondayStart(date: Date): number {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const dow = first.getDay(); // 0..6 (Sun..Sat)
  return (dow + 6) % 7; // 0..6 (Mon..Sun)
}

const MONTHS: Record<Lang, string[]> = {
  ru: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

const WEEKDAYS: Record<Lang, string[]> = {
  ru: ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

export function DatePickerModal({
  open,
  title,
  valueIso,
  lang,
  minIso,
  clearLabel,
  closeLabel,
  onSelect,
  onClear,
  onClose,
}: {
  open: boolean;
  title: string;
  valueIso: string | null;
  lang: Lang;
  minIso?: string;
  clearLabel: string;
  closeLabel: string;
  onSelect: (nextIso: string) => void;
  onClear: () => void;
  onClose: () => void;
}): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const minDate = useMemo(() => {
    const parsed = minIso ? parseIsoDateLocal(minIso) : null;
    return stripTime(parsed ?? new Date());
  }, [minIso]);

  const [cursor, setCursor] = useState<Date>(() => stripTime(new Date()));

  useEffect(() => {
    if (!open) return;
    const selected = valueIso ? parseIsoDateLocal(valueIso) : null;
    setCursor(stripTime(selected ?? new Date()));
  }, [open, valueIso]);

  const monthLabel = `${MONTHS[lang][cursor.getMonth()]} ${cursor.getFullYear()}`;
  const totalDays = daysInMonth(cursor);
  const offset = firstDayOffsetMondayStart(cursor);

  const selectedIso = valueIso?.trim() ? valueIso.trim() : null;
  const selectedDate = selectedIso ? parseIsoDateLocal(selectedIso) : null;
  const selectedStripped = selectedDate ? stripTime(selectedDate) : null;

  const today = stripTime(new Date());
  const minMs = minDate.getTime();

  const cells: Array<{ iso: string | null; day: number | null; disabled?: boolean; isToday?: boolean; isSelected?: boolean }> = [];
  for (let i = 0; i < offset; i++) {
    cells.push({ iso: null, day: null });
  }
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth(), day);
    const stripped = stripTime(d);
    const iso = toIsoDateLocal(stripped);
    const ms = stripped.getTime();
    const disabled = ms < minMs;
    const isToday = ms === today.getTime();
    const isSelected = selectedStripped ? ms === selectedStripped.getTime() : false;
    cells.push({ iso, day, disabled, isToday, isSelected });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ iso: null, day: null });
  }
  // Keep stable height (6 rows) to avoid layout jumps.
  while (cells.length < 42) {
    cells.push({ iso: null, day: null });
  }

  const canGoPrev = addMonths(cursor, -1).getTime() >= new Date(minDate.getFullYear(), minDate.getMonth(), 1).getTime();

  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={[
            styles.backdrop,
            { backgroundColor: theme.isDark ? "rgba(0,0,0,0.60)" : "rgba(0,0,0,0.40)" },
          ]}
          onPress={onClose}
        />

        <View style={styles.center} pointerEvents="box-none">
          <Card style={styles.card} elevated>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={(state) => [styles.closeButton, state.pressed ? { opacity: 0.75 } : null]}
              >
                <Ionicons name="close" size={18} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.monthRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Prev month"
                onPress={() => (canGoPrev ? setCursor(addMonths(cursor, -1)) : null)}
                disabled={!canGoPrev}
                style={({ pressed }) => [
                  styles.monthBtn,
                  !canGoPrev ? styles.monthBtnDisabled : null,
                  pressed && canGoPrev ? styles.monthBtnPressed : null,
                ]}
              >
                <Ionicons name="chevron-back" size={18} color={!canGoPrev ? theme.colors.textMuted : theme.colors.text} />
              </Pressable>

              <Text style={[styles.monthLabel, { color: theme.colors.text }]} numberOfLines={1}>
                {monthLabel}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                onPress={() => setCursor(addMonths(cursor, 1))}
                style={({ pressed }) => [styles.monthBtn, pressed ? styles.monthBtnPressed : null]}
              >
                <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS[lang].map((w) => (
                <Text key={w} style={[styles.weekDay, { color: theme.colors.textMuted }]}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((cell, idx) => {
                if (!cell.day || !cell.iso) {
                  return <View key={`e-${idx}`} style={styles.cell} />;
                }

                const disabled = Boolean(cell.disabled);
                const selected = Boolean(cell.isSelected);
                const todayCell = Boolean(cell.isToday);

                return (
                  <View key={cell.iso} style={styles.cell}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={cell.iso}
                      disabled={disabled}
                      onPress={() => {
                        if (disabled) return;
                        onSelect(cell.iso!);
                      }}
                      style={({ pressed }) => [
                        styles.dayBtn,
                        todayCell ? styles.dayBtnToday : null,
                        selected ? { backgroundColor: theme.colors.primary } : null,
                        disabled ? styles.dayBtnDisabled : null,
                        pressed && !disabled ? styles.dayBtnPressed : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          { color: selected ? "#FFFFFF" : disabled ? theme.colors.textMuted : theme.colors.text },
                        ]}
                      >
                        {cell.day}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View style={styles.actions}>
              <PrimaryButton tone="soft" title={clearLabel} onPress={onClear} />
              <PrimaryButton tone="soft" title={closeLabel} onPress={onClose} />
            </View>
          </Card>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.lg,
    },
    card: {
      width: "100%",
      maxWidth: 520,
      gap: spacing.sm,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    title: {
      ...font(900),
      fontSize: 16,
      flex: 1,
    },
    closeButton: {
      padding: 6,
      borderRadius: 999,
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object ),
    },
    monthRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    monthBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object ),
    },
    monthBtnPressed: {
      opacity: 0.92,
    },
    monthBtnDisabled: {
      opacity: 0.5,
    },
    monthLabel: {
      flex: 1,
      textAlign: "center",
      ...font(800),
      fontSize: 14,
    },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 2,
    },
    weekDay: {
      width: "14.2857%",
      textAlign: "center",
      ...font(700),
      fontSize: 12,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      borderRadius: 16,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
    },
    cell: {
      width: "14.2857%",
      padding: 6,
    },
    dayBtn: {
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object ),
    },
    dayBtnPressed: {
      opacity: 0.9,
    },
    dayBtnDisabled: {
      opacity: 0.55,
    },
    dayBtnToday: {
      borderWidth: 1,
      borderColor: theme.colors.focus,
    },
    dayText: {
      ...font(700),
      fontSize: 13,
    },
    actions: {
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
  });
}
