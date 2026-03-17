import { Platform } from 'react-native';

function defaultBaseUrl() {
  // Web runs on your PC, so localhost works.
  if (Platform.OS === 'web') return 'http://localhost:4000';
  // Android emulator uses 10.0.2.2 to reach your PC.
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  // iOS simulator can use localhost to reach your Mac; on Windows you likely won't use iOS.
  return 'http://localhost:4000';
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultBaseUrl();

export async function apiFetch(path: string, init?: RequestInit) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, init);

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore non-json
  }

  if (!res.ok) {
    const message = json?.error || json?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return json;
}

export async function authedApiFetch(path: string, token: string, init?: RequestInit) {
  const headers = {
    ...(init?.headers || {}),
    Authorization: `Bearer ${token}`,
  } as Record<string, string>;

  return apiFetch(path, { ...(init || {}), headers });
}

