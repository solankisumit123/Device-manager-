import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

const DEVICE_KEY = "dmp_device_id";

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cachedId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;
  const existing = await storage.getItem(DEVICE_KEY, "");
  if (existing) {
    cachedId = existing as string;
    return cachedId;
  }
  const id = uuid();
  await storage.setItem(DEVICE_KEY, id);
  cachedId = id;
  return id;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export const api = {
  getDashboard: async () => {
    const id = await getDeviceId();
    return request<any>(`/dashboard?device_id=${id}`);
  },
  getAiTip: async () => {
    const id = await getDeviceId();
    return request<any>(`/ai-tip?device_id=${id}`);
  },
  saveScan: async (body: Record<string, any>) => {
    const id = await getDeviceId();
    return request<any>(`/scans`, {
      method: "POST",
      body: JSON.stringify({ device_id: id, ...body }),
    });
  },
  listScans: async () => {
    const id = await getDeviceId();
    return request<any[]>(`/scans?device_id=${id}`);
  },
  getPrefs: async () => {
    const id = await getDeviceId();
    return request<any>(`/prefs?device_id=${id}`);
  },
  updatePrefs: async (body: Record<string, any>) => {
    const id = await getDeviceId();
    return request<any>(`/prefs`, {
      method: "PUT",
      body: JSON.stringify({ device_id: id, ...body }),
    });
  },
  listTrash: async () => {
    const id = await getDeviceId();
    return request<any[]>(`/trash?device_id=${id}`);
  },
  addTrash: async (items: Record<string, any>[]) => {
    const id = await getDeviceId();
    return request<any[]>(`/trash`, {
      method: "POST",
      body: JSON.stringify({ device_id: id, items }),
    });
  },
  restoreTrash: async (ids: string[]) => {
    const id = await getDeviceId();
    return request<any>(`/trash/restore`, {
      method: "POST",
      body: JSON.stringify({ device_id: id, ids }),
    });
  },
  deleteTrash: async (ids: string[]) => {
    const id = await getDeviceId();
    return request<any>(`/trash`, {
      method: "DELETE",
      body: JSON.stringify({ device_id: id, ids }),
    });
  },
  listVault: async () => {
    const id = await getDeviceId();
    return request<any[]>(`/vault?device_id=${id}`);
  },
  addVault: async (body: Record<string, any>) => {
    const id = await getDeviceId();
    return request<any>(`/vault`, {
      method: "POST",
      body: JSON.stringify({ device_id: id, ...body }),
    });
  },
  removeVault: async (itemId: string) => {
    const id = await getDeviceId();
    return request<any>(`/vault/${itemId}?device_id=${id}`, {
      method: "DELETE",
    });
  },
};
