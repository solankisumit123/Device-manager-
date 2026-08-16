export const colors = {
  surface: "#F2F3F5",
  onSurface: "#1C1C1E",
  card: "#FFFFFF",
  onCard: "#1C1C1E",
  surfaceTertiary: "#E5E5EA",
  onSurfaceTertiary: "#3A3A3C",
  inverse: "#1C1C1E",
  onInverse: "#FFFFFF",
  brand: "#38A845",
  brandDark: "#2E8B3C",
  onBrand: "#FFFFFF",
  brandSoft: "#E8F5E9",
  brandTint: "#F0FDF4",
  success: "#38A845",
  warning: "#FF9800",
  error: "#F44336",
  info: "#2196F3",
  purple: "#7C4DFF",
  border: "#E5E5EA",
  borderStrong: "#D1D1D6",
  divider: "#ECECEE",
  muted: "#8E8E93",
  mutedLight: "#AEAEB2",
  track: "#E9EAEC",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const maxContentWidth = 640;

export const font = {
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  huge: 34,
  giant: 48,
};

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  lifted: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
};

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}
