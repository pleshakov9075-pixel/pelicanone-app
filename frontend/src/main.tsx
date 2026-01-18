import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppRouter } from "./app/router";
import { queryClient } from "./app/queryClient";
import { detectPlatform } from "./adapters/platform";
import { getTelegramInitData } from "./adapters/telegram";
import { getVkLaunchParams } from "./adapters/vk";
import { apiFetch, getAuthToken, setAuthToken } from "./api/client";
import "./styles/index.css";

function App() {
  const [authState, setAuthState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      setAuthState("ready");
      return;
    }

    const platform = detectPlatform();
    if (platform === "telegram") {
      const initData = getTelegramInitData();
      if (!initData) {
        setAuthState("error");
        return;
      }
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

    if (platform === "vk") {
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

    setAuthState("error");
  }, []);

  if (authState === "loading") {
    return <div className="p-6">Authorizing...</div>;
  }

  if (authState === "error") {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">PelicanOne 2.0</h1>
        <p className="text-sm text-gray-500">
          Web режим: требуется JWT от backend. Запустите приложение через Telegram/VK.
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
