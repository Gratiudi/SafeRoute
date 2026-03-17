import { Platform } from 'react-native';

// Safe token storage for native + web + Expo Router SSR.
// - Native: AsyncStorage
// - Web (client): localStorage
// - Web (SSR): in-memory (login still works once hydrated)

let memoryToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return memoryToken;
    return window.localStorage.getItem('saferoute_token');
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return AsyncStorage.getItem('saferoute_token');
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    memoryToken = token;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('saferoute_token', token);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.setItem('saferoute_token', token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    memoryToken = null;
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('saferoute_token');
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.removeItem('saferoute_token');
}

