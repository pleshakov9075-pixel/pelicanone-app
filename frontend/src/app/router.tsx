import { useEffect, useState } from "react";
import { Balance } from "../pages/Balance";
import { History } from "../pages/History";
import { Home } from "../pages/Home";
import { ImageGenerate } from "../pages/ImageGenerate";
import { JobStatus } from "../pages/JobStatus";
import { Button } from "../components/ui/button";
import { getPresets, Preset } from "../api/presets";
import { PresetsContext } from "./presets";
import { ru } from "../i18n/ru";

const routes = {
  home: Home,
  generate: ImageGenerate,
  status: JobStatus,
  history: History,
  balance: Balance
};

export type RouteKey = keyof typeof routes;

function withDefaultEta(preset: Preset): Preset {
  if (preset.eta_seconds !== null && preset.eta_seconds !== undefined) {
    return preset;
  }
  const defaultEtaByType: Record<string, number> = {
    text: 20,
    image: 45,
    video: 60,
    audio: 40
  };
  return {
    ...preset,
    eta_seconds: defaultEtaByType[preset.job_type] ?? 30
  };
}

export function AppRouter() {
  const [route, setRoute] = useState<RouteKey>("home");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [presetError, setPresetError] = useState<string | null>(null);
  const Active = routes[route];
  const isDevMode = localStorage.getItem("dev_mode") === "true";

  useEffect(() => {
    getPresets()
      .then((data) => {
        setPresets(data.items.map((preset) => withDefaultEta(preset)));
        setLoadingPresets(false);
      })
      .catch((err) => {
        setPresetError(err instanceof Error ? err.message : "presets_error");
        setLoadingPresets(false);
      });
  }, []);

  return (
    <PresetsContext.Provider value={{ presets, loading: loadingPresets, error: presetError }}>
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 pb-[env(safe-area-inset-bottom)] pt-6">
        <header className="flex flex-wrap items-center gap-2">
          {Object.keys(routes).map((key) => (
            <Button key={key} onClick={() => setRoute(key as RouteKey)}>
              {ru.routes[key as RouteKey]}
            </Button>
          ))}
          {isDevMode ? (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                {ru.labels.devMode}
              </span>
              <Button
                onClick={() => {
                  localStorage.removeItem("auth_token");
                  localStorage.removeItem("dev_mode");
                  location.reload();
                }}
                type="button"
              >
                {ru.actions.logout}
              </Button>
            </div>
          ) : null}
        </header>
        <Active onNavigate={setRoute} />
      </div>
    </PresetsContext.Provider>
  );
}
