import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppRouter } from "./app/router";
import { queryClient } from "./app/queryClient";
import { getTelegramInitData, getTelegramWebApp, hasTelegramWebApp } from "./adapters/telegram";
import { ru } from "./i18n/ru";
import "./styles/index.css";

function App() {
  const [authState, setAuthState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    if (!hasTelegramWebApp()) {
      setAuthState("missing");
      return;
    }
    const tg = getTelegramWebApp();
    tg?.ready?.();
    tg?.expand?.();

    const initData = getTelegramInitData();
    setAuthState(initData ? "ready" : "missing");
  }, []);

  if (authState === "loading") {
    return <div className="p-6">{ru.messages.authorizing}</div>;
  }

  if (authState === "missing") {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">{ru.titles.app}</h1>
        <p className="text-sm text-gray-500">{ru.messages.telegramInitDataMissing}</p>
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
