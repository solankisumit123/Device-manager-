import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { storage } from "@/src/utils/storage";
import { colors, font, radius, shadow, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";

type ToastKind = "success" | "error" | "info";

type AppState = {
  premium: boolean;
  setPremium: (v: boolean) => void;
  toast: (msg: string, kind?: ToastKind) => void;
};

const Ctx = createContext<AppState | null>(null);

const PREMIUM_KEY = "dmp_premium";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [premium, setPremiumState] = useState(false);
  const insets = useSafeAreaInsets();

  const [msg, setMsg] = useState<string>("");
  const [kind, setKind] = useState<ToastKind>("success");
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const p = await storage.getItem(PREMIUM_KEY, false);
      setPremiumState(!!p);
    })();
  }, []);

  const setPremium = useCallback((v: boolean) => {
    setPremiumState(v);
    storage.setItem(PREMIUM_KEY, v);
    api.updatePrefs({ premium: v }).catch(() => {});
  }, []);

  const toast = useCallback(
    (m: string, k: ToastKind = "success") => {
      setMsg(m);
      setKind(k);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      ]).start();
      hideTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 220, useNativeDriver: true }),
        ]).start();
      }, 2400);
    },
    [opacity, translateY],
  );

  const value = useMemo(() => ({ premium, setPremium, toast }), [premium, setPremium, toast]);

  const bg =
    kind === "success" ? colors.brand : kind === "error" ? colors.error : colors.info;
  const icon =
    kind === "success" ? "checkmark-circle" : kind === "error" ? "alert-circle" : "information-circle";

  return (
    <Ctx.Provider value={value}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toastWrap,
          { top: insets.top + spacing.sm, opacity, transform: [{ translateY }] },
        ]}
      >
        <View style={[styles.toast, { backgroundColor: bg }]} testID="app-toast">
          <Ionicons name={icon as any} size={20} color="#fff" />
          <Text style={styles.toastText} numberOfLines={2}>
            {msg}
          </Text>
        </View>
      </Animated.View>
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

const styles = StyleSheet.create({
  toastWrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    maxWidth: 420,
    ...shadow.lifted,
  },
  toastText: { color: "#fff", fontSize: font.base, fontWeight: "600", flexShrink: 1 },
});
