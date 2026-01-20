import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppRouter } from "./app/router";
import { queryClient } from "./app/queryClient";
import { Platform, detectPlatform } from "./adapters/platform";
import { getTelegramInitData } from "./adapters/telegram";
import { getVkLaunchParams } from "./adapters/vk";
import { apiFetch, getAuthToken, setAuthToken } from "./api/client";
import { ru } from "./i18n/ru";
import "./styles/index.css";

function App() {
  const [authState, setAuthState] = useState<"loading" | "ready" | "error" | "dev">(
    "loading"
  );
  const [platform, setPlatform] = useState<Platform>("web");
  const [devError, setDevError] = useState<string | null>(null);
  const devAuthEnabled = import.meta.env.VITE_DEV_AUTH === "true";

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      setAuthState("ready");
      return;
    }

    const detectedPlatform = detectPlatform();
    setPlatform(detectedPlatform);
    if (detectedPlatform === "telegram") {
      const initData = getTelegramInitData();
      if (!initData) {
        setAuthState("error");
        return;
      }
      const tg = window.Telegram?.WebApp;
      tg?.ready?.();
      window.Telegram?.WebApp?.expand?.();
      apiFetch<{ access_token: string }>("/auth/telegram", {
        method: "POST",
        body: JSON.stringify({ initData })
      })
        .then((data) => {
          setAuthToken(data.access_token);
          setAuthState("ready");
        })
        .catch(() => setAuthState("error"));
      return;
    }

    if (detectedPlatform === "vk") {
      const launchParams = getVkLaunchParams();
      apiFetch<{ access_token: string }>("/auth/vk", {
        method: "POST",
        body: JSON.stringify({ launchParams })
      })
        .then((data) => {
          setAuthToken(data.access_token);
          setAuthState("ready");
        })
        .catch(() => setAuthState("error"));
      return;
    }

    setAuthState("dev");
  }, []);

  if (authState === "loading") {
    return <div className="p-6">{ru.messages.authorizing}</div>;
  }

  if (authState === "dev" && platform === "web") {
    if (!devAuthEnabled) {
      return (
        <div className="p-6">
          <h1 className="text-xl font-semibold">{ru.titles.app}</h1>
          <p className="text-sm text-gray-500">{ru.messages.devModeDisabled}</p>
        </div>
      );
    }
    return (
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">{ru.titles.app}</h1>
          <p className="text-sm text-gray-500">{ru.messages.devModeHint}</p>
        </div>
        {devError ? <p className="text-sm text-red-500">{devError}</p> : null}
        <button
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
          onClick={() => {
            setDevError(null);
            setAuthState("loading");
            apiFetch<{ access_token: string }>("/auth/dev", { method: "POST" })
              .then((data) => {
                setAuthToken(data.access_token);
                localStorage.setItem("dev_mode", "true");
                setAuthState("ready");
              })
              .catch(() => {
                setDevError("DEV вход недоступен. Проверьте DEV_AUTH на backend.");
                setAuthState("dev");
              });
          }}
          type="button"
        >
          {ru.actions.devLogin}
        </button>
      </div>
    );
  }

  if (authState === "error") {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">{ru.titles.app}</h1>
        <p className="text-sm text-gray-500">
          {platform === "web"
            ? ru.messages.authRequired
            : ru.messages.authFailed}
        </p>
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
