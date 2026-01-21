import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppRouter } from "./app/router";
import { queryClient } from "./app/queryClient";
import { getTelegramWebApp } from "./adapters/telegram";
import { ru } from "./i18n/ru";
import "./styles/index.css";

function App() {
  const [authState, setAuthState] = useState<"loading" | "ready" | "missing">("loading");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    let isReady = false;

    const intervalId = window.setInterval(() => {
      if (window.Telegram?.WebApp) {
        const tg = getTelegramWebApp();
        tg?.ready?.();
        tg?.expand?.();
        isReady = true;
        setAuthState("ready");
        window.clearInterval(intervalId);
        window.clearTimeout(timeoutId);
      }
    }, 50);

    const timeoutId = window.setTimeout(() => {
      if (!isReady) {
        setAuthState("missing");
      }
      window.clearInterval(intervalId);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, []);

  const debugInfo = useMemo(() => {
    const tg = window.Telegram;
    const webApp = window.Telegram?.WebApp;
    const initData = webApp?.initData ?? "";
    return [
      `window.Telegram: ${Boolean(tg)}`,
      `window.Telegram.WebApp: ${Boolean(webApp)}`,
      `initData length: ${initData ? initData.length : 0}`,
      `userAgent: ${navigator.userAgent}`,
      `location.href: ${window.location.href}`
    ].join("\n");
  }, []);

  if (authState === "loading") {
    return <div className="p-6">{ru.messages.authorizing}</div>;
  }

  const handleCopyDebug = async () => {
    try {
      await navigator.clipboard.writeText(debugInfo);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to copy debug info", error);
      setCopyStatus("failed");
      setTimeout(() => setCopyStatus("idle"), 2000);
    }
  };

  if (authState === "missing") {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">{ru.titles.app}</h1>
        <p className="text-sm text-gray-500">{ru.messages.telegramInitDataMissing}</p>
        <div className="mt-4 space-y-3 text-sm text-gray-700">
          <pre className="whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
            {debugInfo}
          </pre>
          <button
            type="button"
            onClick={handleCopyDebug}
            className="rounded bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
          >
            Copy debug
          </button>
          {copyStatus === "copied" && (
            <div className="text-xs text-green-600">Debug info copied.</div>
          )}
          {copyStatus === "failed" && (
            <div className="text-xs text-red-600">Failed to copy debug info.</div>
          )}
        </div>
      </div>
    );
  }

  return <AppRouter />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
