// 会话:访问口令 + 后端地址。持久化到 expo-secure-store(web 上 secure-store 不支持,改用 localStorage),
// 内存缓存供 api 同步读取。Phase 0 临时鉴权(复用 Web 的 X-Access-Passcode),不做正式账号。

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PASSCODE_KEY = 'lw_passcode';
const API_BASE_KEY = 'lw_api_base';

// 默认连线上 Render(已部署,真机无需配局域网)。可用 EXPO_PUBLIC_API_BASE 覆盖(联调/测试用)。设置页也可切。
export const DEFAULT_API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'https://listenwise-api.onrender.com/api';

const isWeb = Platform.OS === 'web';

// 跨平台存储:web 用 localStorage,原生用 secure-store。
const storage = {
  async get(key: string): Promise<string | null> {
    if (isWeb) {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (isWeb) {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* ignore */
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (isWeb) {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        /* ignore */
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

let apiBase = DEFAULT_API_BASE;
let passcode: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

/** 启动时调用:把持久化的口令/后端地址读进内存。 */
export async function loadSession(): Promise<void> {
  const [storedBase, storedPasscode] = await Promise.all([
    storage.get(API_BASE_KEY),
    storage.get(PASSCODE_KEY),
  ]);
  apiBase = storedBase || DEFAULT_API_BASE;
  passcode = storedPasscode;
}

export function getApiBase(): string {
  return apiBase;
}

export function getPasscode(): string | null {
  return passcode;
}

export async function setPasscode(value: string | null): Promise<void> {
  passcode = value && value.length > 0 ? value : null;
  if (passcode) {
    await storage.set(PASSCODE_KEY, passcode);
  } else {
    await storage.remove(PASSCODE_KEY);
  }
}

export async function setApiBase(value: string): Promise<void> {
  apiBase = value && value.trim().length > 0 ? value.trim().replace(/\/$/, '') : DEFAULT_API_BASE;
  await storage.set(API_BASE_KEY, apiBase);
}

/** 注册「收到 401」时的回调(由口令门注册,用于清口令回门)。 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

/** api 层在 401 时调用。 */
export function handleUnauthorized(): void {
  passcode = null;
  void storage.remove(PASSCODE_KEY);
  unauthorizedHandler?.();
}
