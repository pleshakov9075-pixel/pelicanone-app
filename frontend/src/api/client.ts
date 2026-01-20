import { getTelegramInitData } from "../adapters/telegram";

export const API_BASE = "/api/v1";

const TELEGRAM_INITDATA_HEADER = "X-Telegram-InitData";

function hasInitDataValue(initData: string | null | undefined) {
  return Boolean(initData && initData.trim().length > 0);
}

export function hasTelegramInitData() {
  return hasInitDataValue(getTelegramInitData());
}

export function getTelegramInitDataHeader(): string | null {
  const initData = getTelegramInitData();
  return hasInitDataValue(initData) ? (initData as string) : null;
}

export function buildApiHeaders(optionsHeaders: HeadersInit = {}) {
  const headers = new Headers(optionsHeaders);
  const initData = getTelegramInitDataHeader();
  if (initData) {
    headers.set(TELEGRAM_INITDATA_HEADER, initData);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

async function parseErrorDetail(response: Response) {
  const text = await response.text();
  if (!text) {
    return "request_failed";
  }
  try {
    const parsed = JSON.parse(text) as { detail?: string };
    return parsed.detail || text;
  } catch {
    return text;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const initData = getTelegramInitDataHeader();
  if (!initData) {
    throw new Error("telegram_initdata_missing");
  }
  const headers = buildApiHeaders(options.headers || {});
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const detail = await parseErrorDetail(response);
    throw new Error(detail || "request_failed");
  }
  return response.json() as Promise<T>;
}
