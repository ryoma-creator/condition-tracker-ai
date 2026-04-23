import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ExpoSecureStoreAdapter = Platform.OS === 'web'
  ? {
      getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
      removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
    }
  : {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    };

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type ExerciseLog = {
  type: string;
  minutes: number;
};

export type Meals = {
  breakfast?: '良い' | '普通' | '悪い';
  lunch?: '良い' | '普通' | '悪い';
  dinner?: '良い' | '普通' | '悪い';
};

export type ConditionLog = {
  id: string;
  user_id: string;
  created_at: string;
  date: string;
  bed_time: string;
  wake_time: string;
  sleep_hours: number;
  sleep_quality: number;
  fatigue: number;
  focus: number;
  cold_shower: boolean;
  exercise_logs: ExerciseLog[];
  meals: Meals;
  supplements: string[];
  memo: string;
};
