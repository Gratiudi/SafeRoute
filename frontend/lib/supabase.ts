import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const authOptions =
  Platform.OS === 'web'
    ? {
        // On web (and especially during Expo Router SSR), do not force AsyncStorage.
        // Supabase will fall back to a safe storage implementation.
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      }
    : (() => {
        // Only require AsyncStorage on native to avoid "window is not defined" in web SSR.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        return {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        };
      })();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...authOptions,
  },
});

