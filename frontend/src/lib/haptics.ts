import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// Web-safe haptics. On web the Haptics enums are undefined, and accessing
// `Haptics.NotificationFeedbackStyle.Success` throws synchronously — which would
// abort the surrounding callback before any state updates run. These helpers
// guard the platform and swallow all errors.
export const haptics = {
  impact: () => {
    if (Platform.OS === "web") return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  },
  success: () => {
    if (Platform.OS === "web") return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackStyle.Success);
    } catch {}
  },
  selection: () => {
    if (Platform.OS === "web") return;
    try {
      Haptics.selectionAsync();
    } catch {}
  },
};
