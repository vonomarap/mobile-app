import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { LANG_OPTIONS, type LangCode } from "../constants/languages";
import { getCurrentLanguage, setAppLanguage } from "../services/i18n";

export function TopLeftControls(): JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [langOpen, setLangOpen] = useState(false);

  const currentLang: LangCode = getCurrentLanguage();

  const styles = useMemo(() => makeStyles(theme), [theme]);
  const top = insets.top + spacing.sm;
  const right = insets.right + spacing.sm;
  const menuRight = right;

  const setLanguage = async (next: LangCode) => {
    setLangOpen(false);
    if (currentLang === next) return;
    await setAppLanguage(next);
  };

  return (
    <>
      <View style={[styles.root, { top, right }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Language"
          accessibilityState={{ expanded: langOpen }}
          onPress={() => setLangOpen((v) => !v)}
          style={(state) => {
            const pressed = state.pressed;
            const hovered = (state as unknown as { hovered?: boolean }).hovered;
            const focused = (state as unknown as { focused?: boolean }).focused;

            return [
              styles.pill,
              hovered ? styles.pillHovered : null,
              pressed ? styles.pillPressed : null,
              focused ? styles.pillFocused : null
            ];
          }}
        >
          <Ionicons name="language-outline" size={18} color={theme.colors.primary} />
          <Ionicons name="chevron-down" size={14} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={langOpen}
        onRequestClose={() => setLangOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setLangOpen(false)} />
          <View style={[styles.menu, { top: top + 44, right: menuRight }]}>
            {LANG_OPTIONS.map((opt) => (
              <MenuItem
                key={opt.code}
                label={opt.label}
                selected={currentLang === opt.code}
                onPress={() => void setLanguage(opt.code)}
              />
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

function MenuItem({
  label,
  selected,
  onPress
}: {
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
        const focused = (state as unknown as { focused?: boolean }).focused;

        return [
          styles.menuItem,
          hovered ? styles.menuItemHovered : null,
          pressed ? styles.menuItemPressed : null,
          focused ? styles.menuItemFocused : null
        ];
      }}
    >
      <View style={styles.menuItemLeft}>
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      {selected ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
    </Pressable>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    root: {
      position: "absolute",
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      zIndex: 50,
      elevation: 20
    },
    pill: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      height: 40,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      ...( { cursor: "pointer" } as object ),
      ...(theme.shadow.sm as object)
    },
    pillHovered: {
      opacity: 0.98
    },
    pillPressed: {
      opacity: 0.92
    },
    pillFocused: {
      borderColor: theme.colors.focus
    },
    modalRoot: {
      flex: 1
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject
    },
    menu: {
      position: "absolute",
      width: 220,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 16,
      overflow: "hidden",
      ...(theme.shadow.md as object)
    },
    menuItem: {
      minHeight: 48,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: "transparent",
      ...( { cursor: "pointer" } as object )
    },
    menuItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    menuLabel: {
      fontSize: 14,
      ...font(700),
      color: theme.colors.text
    },
    menuItemHovered: {
      backgroundColor: theme.colors.surface2
    },
    menuItemPressed: {
      opacity: 0.9
    },
    menuItemFocused: {
      borderColor: theme.colors.focus
    }
  });
}
