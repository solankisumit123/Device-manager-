import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors, font } from "@/src/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ScoreGauge({
  score,
  size = 200,
  strokeWidth = 16,
  label,
  sublabel,
  color = colors.brand,
  unit = "pts",
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  unit?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(100, score)) / 100, {
      duration: 1100,
      easing: Easing.out(Easing.cubic),
    });
  }, [score, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

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
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
          />
        </G>
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.score, { fontSize: size * 0.26 }]}>{score}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: "absolute", alignItems: "center", justifyContent: "center" },
  score: { fontWeight: "800", color: colors.onSurface, lineHeight: undefined },
  unit: { fontSize: font.sm, color: colors.muted, fontWeight: "600", marginTop: -4 },
  label: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface, marginTop: 2 },
  sublabel: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
});
