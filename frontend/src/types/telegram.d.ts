export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        expand?: () => void;
        ready?: () => void;
        close?: () => void;
        themeParams?: Record<string, string>;
      };
    };
  }
}
