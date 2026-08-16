import { Platform } from "react-native";
import * as MediaLibrary from "expo-media-library";

export type PhotoAsset = {
  id: string;
  uri: string;
  width: number;
  height: number;
  creationTime: number;
  filename: string;
  size: number; // estimated
};

export type DuplicateGroup = {
  id: string;
  reason: "burst" | "similar" | "exact";
  label: string;
  assets: PhotoAsset[];
  bestId: string; // suggested keeper
  totalBytes: number;
};

const SIM_PHOTOS: string[] = [
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&q=60",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&q=60",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=60",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=60",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=60",
  "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=400&q=60",
];

function simulatedGroups(): DuplicateGroup[] {
  const mk = (url: string, i: number, ts: number): PhotoAsset => ({
    id: `sim-${i}-${Math.random().toString(36).slice(2, 7)}`,
    uri: url,
    width: 1080,
    height: 1350,
    creationTime: ts,
    filename: `IMG_${1000 + i}.jpg`,
    size: 1.6 * 1024 * 1024 + Math.round(Math.random() * 800 * 1024),
  });
  const groups: DuplicateGroup[] = [];
  const now = Date.now();
  // Burst group
  const burst = [0, 0, 0, 0].map((_, i) => mk(SIM_PHOTOS[0], i, now - i * 2000));
  groups.push({
    id: "g-burst",
    reason: "burst",
    label: "Burst photos",
    assets: burst,
    bestId: burst[0].id,
    totalBytes: burst.reduce((a, b) => a + b.size, 0),
  });
  // Similar group
  const sim = [1, 1, 1].map((n, i) => mk(SIM_PHOTOS[1], i, now - 86400000 - i * 3000));
  groups.push({
    id: "g-sim",
    reason: "similar",
    label: "Similar shots",
    assets: sim,
    bestId: sim[0].id,
    totalBytes: sim.reduce((a, b) => a + b.size, 0),
  });
  // Exact group
  const exact = [2, 2].map((n, i) => mk(SIM_PHOTOS[2], i, now - 200000000));
  groups.push({
    id: "g-exact",
    reason: "exact",
    label: "Exact duplicates",
    assets: exact,
    bestId: exact[0].id,
    totalBytes: exact.reduce((a, b) => a + b.size, 0),
  });
  // A couple more similar
  const sim2 = [3, 3, 3].map((n, i) => mk(SIM_PHOTOS[3], i, now - 400000000 - i * 4000));
  groups.push({
    id: "g-sim2",
    reason: "similar",
    label: "Similar shots",
    assets: sim2,
    bestId: sim2[0].id,
    totalBytes: sim2.reduce((a, b) => a + b.size, 0),
  });
  return groups;
}

export async function ensurePhotoPermission(): Promise<MediaLibrary.PermissionResponse | null> {
  try {
    return await MediaLibrary.getPermissionsAsync();
  } catch {
    return null;
  }
}

export async function requestPhotoPermission(): Promise<MediaLibrary.PermissionResponse | null> {
  try {
    return await MediaLibrary.requestPermissionsAsync();
  } catch {
    return null;
  }
}

// Groups assets that were taken within `windowMs` and share dimensions -> likely bursts / duplicates.
export async function scanDuplicates(): Promise<{
  groups: DuplicateGroup[];
  photoCount: number;
  simulated: boolean;
}> {
  if (Platform.OS === "web") {
    const g = simulatedGroups();
    return { groups: g, photoCount: 60, simulated: true };
  }
  let perm: MediaLibrary.PermissionResponse | null = null;
  try {
    perm = await MediaLibrary.getPermissionsAsync();
  } catch {
    perm = null;
  }
  if (!perm || !perm.granted) {
    const g = simulatedGroups();
    return { groups: g, photoCount: 60, simulated: true };
  }

  try {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: ["photo"],
      first: 500,
      sortBy: [MediaLibrary.SortBy.creationTime],
    });
    const assets: PhotoAsset[] = page.assets.map((a) => ({
      id: a.id,
      uri: a.uri,
      width: a.width,
      height: a.height,
      creationTime: a.creationTime,
      filename: a.filename,
      size: 2 * 1024 * 1024,
    }));

    const groups: DuplicateGroup[] = [];
    const windowMs = 5000;
    let bucket: PhotoAsset[] = [];
    const flush = () => {
      if (bucket.length >= 2) {
        const totalBytes = bucket.reduce((a, b) => a + b.size, 0);
        groups.push({
          id: `g-${bucket[0].id}`,
          reason: "burst",
          label: "Burst photos",
          assets: [...bucket],
          bestId: bucket[0].id,
          totalBytes,
        });
      }
      bucket = [];
    };
    for (let i = 0; i < assets.length; i++) {
      const a = assets[i];
      if (bucket.length === 0) {
        bucket.push(a);
        continue;
      }
      const prev = bucket[bucket.length - 1];
      const close = Math.abs(a.creationTime - prev.creationTime) * 1000 <= windowMs
        || Math.abs(a.creationTime - prev.creationTime) <= windowMs;
      const sameDim = a.width === prev.width && a.height === prev.height;
      if (close && sameDim) {
        bucket.push(a);
      } else {
        flush();
        bucket.push(a);
      }
    }
    flush();

    if (groups.length === 0) {
      // No natural bursts found — surface the simulated preview so the module is demoable
      const g = simulatedGroups();
      return { groups: g, photoCount: assets.length, simulated: true };
    }
    return { groups, photoCount: assets.length, simulated: false };
  } catch {
    const g = simulatedGroups();
    return { groups: g, photoCount: 60, simulated: true };
  }
}
