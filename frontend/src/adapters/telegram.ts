export function getTelegramInitData(): string | null {
  return window.Telegram?.WebApp?.initData ?? null;
}
