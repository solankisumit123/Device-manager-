import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, font, radius, spacing } from "@/src/theme";
import { formatBytes } from "@/src/theme";

export type Segment = { key: string; color: string; bytes: number };

export function StorageBar({
  used,
  total,
  segments,
  height = 10,
}: {
  used: number;
  total: number;
  segments?: Segment[];
  height?: number;
}) {
  const safeTotal = total || 1;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      {segments && segments.length ? (
        segments.map((s) => (
          <View
            key={s.key}
            style={{
              width: `${Math.max((s.bytes / safeTotal) * 100, 0)}%`,
              backgroundColor: s.color,
              height: "100%",
            }}
          />
        ))
      ) : (
        <View
          style={{
            width: `${Math.min((used / safeTotal) * 100, 100)}%`,
            backgroundColor: colors.brand,
            height: "100%",
            borderRadius: height / 2,
          }}
        />
      )}
    </View>
  );
}

export function StorageCard({
  used,
  total,
  segments,
}: {
  used: number;
  total: number;
  segments?: Segment[];
}) {
  return (
    <View style={styles.card} testID="storage-card">
      <View style={styles.row}>
        <Text style={styles.title}>Storage space</Text>
        <Text style={styles.sub}>
          {formatBytes(used)} of {formatBytes(total)} used
        </Text>
      </View>
      <StorageBar used={used} total={total} segments={segments} height={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    backgroundColor: colors.track,
    overflow: "hidden",
    flexDirection: "row",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface },
  sub: { fontSize: font.sm, color: colors.muted },
});
