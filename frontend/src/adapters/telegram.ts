export function getTelegramWebApp() {
  return window.Telegram?.WebApp ?? null;
}

export function getTelegramInitData(): string | null {
  return getTelegramWebApp()?.initData ?? null;
}

export function hasTelegramWebApp() {
  return Boolean(getTelegramWebApp());
}
