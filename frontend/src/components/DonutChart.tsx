import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { colors, font } from "@/src/theme";
import { formatBytes } from "@/src/theme";

export type DonutSlice = { key: string; label: string; color: string; bytes: number };

export function DonutChart({
  slices,
  size = 180,
  strokeWidth = 22,
  centerTop,
  centerBottom,
}: {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerTop?: string;
  centerBottom?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((a, b) => a + b.bytes, 0) || 1;
  let offset = 0;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.track}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {slices.map((s) => {
            const frac = s.bytes / total;
            const dash = frac * circumference;
            const gap = circumference - dash;
            const el = (
              <Circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={s.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="butt"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return el;
          })}
        </G>
      </Svg>
      <View style={styles.center}>
        {centerTop ? <Text style={styles.centerTop}>{centerTop}</Text> : null}
        {centerBottom ? <Text style={styles.centerBottom}>{centerBottom}</Text> : null}
      </View>
    </View>
  );
}

export function DonutLegend({ slices }: { slices: DonutSlice[] }) {
  return (
    <View style={styles.legend}>
      {slices.map((s) => (
        <View key={s.key} style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: s.color }]} />
          <Text style={styles.legendLabel}>{s.label}</Text>
          <Text style={styles.legendValue}>{formatBytes(s.bytes)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: "absolute", alignItems: "center", justifyContent: "center" },
  centerTop: { fontSize: font.xl, fontWeight: "800", color: colors.onSurface },
  centerBottom: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  legend: { gap: 10, flex: 1 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: font.base, color: colors.onSurface, flex: 1 },
  legendValue: { fontSize: font.base, color: colors.muted, fontWeight: "600" },
});
