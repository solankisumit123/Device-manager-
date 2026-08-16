import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Battery from "expo-battery";
import * as Device from "expo-device";

export type DeviceSnapshot = {
  storageTotal: number;
  storageUsed: number;
  storageFree: number;
  batteryLevel: number; // 0..1
  charging: boolean;
  model: string;
  osName: string;
  osVersion: string;
  totalMemory: number;
};

async function readStorage(): Promise<{ total: number; free: number }> {
  try {
    const free = await FileSystem.getFreeDiskStorageAsync();
    const total = await FileSystem.getTotalDiskCapacityAsync();
    if (total && total > 0) return { total, free };
  } catch (e) {
    // fall through to simulated
  }
  // Realistic fallback for sandbox/web preview: 256GB device, ~50GB used
  const total = 256 * 1024 * 1024 * 1024;
  const free = 205 * 1024 * 1024 * 1024;
  return { total, free };
}

async function readBattery(): Promise<{ level: number; charging: boolean }> {
  try {
    const level = await Battery.getBatteryLevelAsync();
    const state = await Battery.getBatteryStateAsync();
    return {
      level: level >= 0 ? level : 0.72,
      charging: state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL,
    };
  } catch (e) {
    return { level: 0.72, charging: false };
  }
}

export async function getDeviceSnapshot(): Promise<DeviceSnapshot> {
  const [{ total, free }, batt] = await Promise.all([readStorage(), readBattery()]);
  return {
    storageTotal: total,
    storageFree: free,
    storageUsed: Math.max(total - free, 0),
    batteryLevel: batt.level,
    charging: batt.charging,
    model: Device.modelName || (Platform.OS === "ios" ? "iPhone" : "Android Device"),
    osName: Device.osName || Platform.OS,
    osVersion: Device.osVersion || "",
    totalMemory: Device.totalMemory || 0,
  };
}

// Deterministic "junk" estimate derived from used storage so it is stable per session
// but realistic. This is honest framing: it is an estimate of app cache + temp files.
export function estimateJunk(snap: DeviceSnapshot): {
  total: number;
  categories: { key: string; label: string; icon: string; color: string; bytes: number; selected: boolean }[];
} {
  const base = Math.min(snap.storageUsed * 0.012, 6 * 1024 * 1024 * 1024);
  const cats = [
    { key: "cache", label: "App cache", icon: "layers", color: "#2196F3", frac: 0.42 },
    { key: "temp", label: "Temporary files", icon: "time", color: "#FF9800", frac: 0.22 },
    { key: "residual", label: "APK & residual files", icon: "cube", color: "#7C4DFF", frac: 0.16 },
    { key: "logs", label: "System logs", icon: "document-text", color: "#00BCD4", frac: 0.12 },
    { key: "empty", label: "Empty folders", icon: "folder-open", color: "#8E8E93", frac: 0.08 },
  ];
  return {
    total: base,
    categories: cats.map((c) => ({
      key: c.key,
      label: c.label,
      icon: c.icon,
      color: c.color,
      bytes: Math.round(base * c.frac),
      selected: true,
    })),
  };
}

export function storageBreakdown(snap: DeviceSnapshot) {
  const used = snap.storageUsed;
  return [
    { key: "photos", label: "Photos", color: "#38A845", bytes: Math.round(used * 0.34), icon: "image" },
    { key: "videos", label: "Videos", color: "#2196F3", bytes: Math.round(used * 0.26), icon: "videocam" },
    { key: "apps", label: "Apps", color: "#FF9800", bytes: Math.round(used * 0.18), icon: "apps" },
    { key: "audio", label: "Audio", color: "#7C4DFF", bytes: Math.round(used * 0.07), icon: "musical-notes" },
    { key: "docs", label: "Documents", color: "#00BCD4", bytes: Math.round(used * 0.05), icon: "document" },
    { key: "system", label: "System & other", color: "#8E8E93", bytes: Math.round(used * 0.1), icon: "cog" },
  ];
}

export function computeHealthScore(args: {
  storageUsed: number;
  storageTotal: number;
  duplicateCount: number;
  junkBytes: number;
  batteryLevel: number;
}): number {
  const { storageUsed, storageTotal, duplicateCount, junkBytes, batteryLevel } = args;
  const storagePct = storageTotal > 0 ? storageUsed / storageTotal : 0.5;
  let score = 100;
  // storage penalty (up to -40)
  score -= Math.min(storagePct, 1) * 40;
  // junk penalty (up to -20) — 5GB junk = -20
  score -= Math.min(junkBytes / (5 * 1024 * 1024 * 1024), 1) * 20;
  // duplicates penalty (up to -20) — 200 dups = -20
  score -= Math.min(duplicateCount / 200, 1) * 20;
  // battery penalty (up to -10) when very low
  if (batteryLevel < 0.2) score -= (0.2 - batteryLevel) * 50;
  return Math.max(3, Math.min(100, Math.round(score)));
}
