export type Platform = "telegram" | "vk" | "web";

declare global {
  interface Window {
    Telegram?: { WebApp?: { initData?: string } };
    VKBridge?: unknown;
  }
}

export function detectPlatform(): Platform {
  if (window.Telegram?.WebApp?.initData) {
    return "telegram";
  }
  if (window.VKBridge) {
    return "vk";
  }
  return "web";
}
