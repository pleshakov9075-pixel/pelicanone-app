import { getTelegramInitData } from "../adapters/telegram";
import { ru } from "../i18n/ru";

export const API_BASE = "/api/v1";
export const DEV_AUTH_BYPASS_ENABLED = import.meta.env.VITE_DEV_AUTH_BYPASS === "true";

let tokenCache: string | null = localStorage.getItem("auth_token");
let initDataWarningShown = false;

const TELEGRAM_INITDATA_HEADER = "X-Telegram-InitData";

function hasInitDataValue(initData: string | null | undefined) {
  return Boolean(initData && initData.trim().length > 0);
}

export function hasTelegramInitData() {
  return hasInitDataValue(getTelegramInitData());
}

export function notifyMissingTelegramInitData() {
  if (initDataWarningShown) {
    return;
  }
  if (typeof window === "undefined") {
    return;
  }
  initDataWarningShown = true;
  window.alert(ru.messages.telegramInitDataMissing);
}

export function setAuthToken(token: string) {
  tokenCache = token;
  localStorage.setItem("auth_token", token);
}

export function getAuthToken() {
  return tokenCache;
}

export function buildApiHeaders(optionsHeaders: HeadersInit = {}) {
  const headers = new Headers(optionsHeaders);
  if (tokenCache) {
    headers.set("Authorization", `Bearer ${tokenCache}`);
  }
  const initData = getTelegramInitData();
  if (hasInitDataValue(initData)) {
    headers.set(TELEGRAM_INITDATA_HEADER, initData as string);
  } else {
    notifyMissingTelegramInitData();
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = buildApiHeaders(options.headers || {});
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "request_failed");
  }
  return response.json() as Promise<T>;
}
