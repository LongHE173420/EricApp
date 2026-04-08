/**
 * SessionStore — mirrors AutoEric's tokenStore.ts
 * Dùng react-native-keychain để lưu session an toàn (encrypted).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { v4 as uuidv4 } from 'uuid';
import type { StoredSession } from '../service/auth/AuthService';

const ACCESS_TOKEN_SERVICE = 'ericapp.access_token';
const BASE_URL_KEY = 'ericapp.base_url';
const DEVICE_ID_KEY = 'ericapp.device_id';
const SESSION_META_KEY = 'ericapp.session_meta';
const REFRESH_TOKEN_KEY = 'ericapp.refresh_token';

type StoredSessionMeta = Omit<StoredSession, 'accessToken' | 'refreshToken'>;

export async function readStoredSession(): Promise<StoredSession | null> {
  try {
    const [credentials, refreshToken, sessionMetaRaw] = await Promise.all([
      Keychain.getGenericPassword({ service: ACCESS_TOKEN_SERVICE }),
      AsyncStorage.getItem(REFRESH_TOKEN_KEY),
      AsyncStorage.getItem(SESSION_META_KEY),
    ]);

    if (!credentials || !refreshToken || !sessionMetaRaw) return null;

    const meta = JSON.parse(sessionMetaRaw) as StoredSessionMeta;
    return {
      ...meta,
      accessToken: credentials.password,
      refreshToken,
    };
  } catch {
    return null;
  }
}

export async function persistSession(session: StoredSession): Promise<void> {
  const { accessToken, refreshToken, ...meta } = session;

  await Promise.all([
    Keychain.setGenericPassword('accessToken', accessToken, {
      service: ACCESS_TOKEN_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
    AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
    AsyncStorage.setItem(SESSION_META_KEY, JSON.stringify(meta)),
  ]);
}

export async function clearStoredSession(): Promise<void> {
  await Promise.all([
    Keychain.resetGenericPassword({ service: ACCESS_TOKEN_SERVICE }),
    AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
    AsyncStorage.removeItem(SESSION_META_KEY),
  ]);
}

export async function readStoredBaseUrl(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(BASE_URL_KEY);
  } catch {
    return null;
  }
}

export async function persistBaseUrl(baseUrl: string): Promise<void> {
  await AsyncStorage.setItem(BASE_URL_KEY, baseUrl.trim());
}

export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.trim()) return existing.trim();

    const next = uuidv4().toUpperCase();
    await AsyncStorage.setItem(DEVICE_ID_KEY, next);
    return next;
  } catch {
    return uuidv4().toUpperCase();
  }
}
