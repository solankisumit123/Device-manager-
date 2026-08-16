import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "@/src/lib/haptics";
import { colors, font, radius, shadow, spacing } from "@/src/theme";

export function Card({
  children,
  style,
  testID,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function IconChip({
  name,
  color,
  size = 22,
  bg,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
  bg?: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: bg || color + "1A" }]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

export function PillButton({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}) {
  const bg =
    variant === "primary"
      ? colors.brand
      : variant === "danger"
        ? colors.error
        : variant === "secondary"
          ? colors.surfaceTertiary
          : "transparent";
  const fg =
    variant === "secondary" ? colors.onSurface : variant === "ghost" ? colors.brand : "#fff";

  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={() => {
        haptics.impact();
        onPress();
      }}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.9 : 1 },
        variant === "ghost" && styles.pillGhost,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  testID,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  testID?: string;
}) {
  return (
    <View style={styles.sectionHeader} testID={testID}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.screenHeader}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn} testID="header-back-button">
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
      ) : (
        <View style={styles.backBtn} />
      )}
      <Text style={styles.screenTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    minHeight: 56,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  pillGhost: { minHeight: 0, paddingHorizontal: 0 },
  pillText: { fontSize: font.lg, fontWeight: "700" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: { fontSize: font.base, fontWeight: "700", color: colors.muted },
  sectionAction: { fontSize: font.base, fontWeight: "700", color: colors.brand },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  screenTitle: { flex: 1, fontSize: font.xl, fontWeight: "700", color: colors.onSurface },
  headerRight: { minWidth: 40, alignItems: "flex-end" },
});
