import { useEffect, useState, type ComponentType } from "react";
import { Balance } from "../pages/Balance";
import { History } from "../pages/History";
import { Home } from "../pages/Home";
import { ImageGenerate } from "../pages/ImageGenerate";
import { JobDetails } from "../pages/JobDetails";
import { Button } from "../components/ui/button";
import { getPresets, Preset } from "../api/presets";
import { PresetsContext } from "./presets";
import { ru } from "../i18n/ru";

const routes = {
  home: Home,
  generate: ImageGenerate,
  history: History,
  balance: Balance,
  job: JobDetails
};

export type RouteKey = keyof typeof routes;
type NavRouteKey = Exclude<RouteKey, "job">;
type RouteState = {
  key: RouteKey;
  jobId?: string | null;
};

const navRoutes: NavRouteKey[] = ["home", "generate", "history", "balance"];

function parseHash(): RouteState {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) {
    return { key: "home" };
  }
  const normalized = raw.startsWith("/") ? raw.slice(1) : raw;
  const parts = normalized.split("/").filter(Boolean);
  if ((parts[0] === "jobs" || parts[0] === "job") && parts[1]) {
    return { key: "job", jobId: parts[1] };
  }
  if (parts[0] && parts[0] in routes) {
    return { key: parts[0] as RouteKey };
  }
  return { key: "home" };
}

function buildHash(route: RouteKey, payload?: { jobId?: string | null }) {
  if (route === "job") {
    const jobId = payload?.jobId;
    return jobId ? `#/jobs/${jobId}` : "#/jobs";
  }
  return `#/${route}`;
}

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
  const [routeState, setRouteState] = useState<RouteState>(() => parseHash());
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [presetError, setPresetError] = useState<string | null>(null);
  const Active = routes[routeState.key] as ComponentType<{
    onNavigate: (route: RouteKey, payload?: { jobId?: string | null }) => void;
    jobId?: string | null;
  }>;

  const handleNavigate = (key: RouteKey, payload?: { jobId?: string | null }) => {
    const next = { key, jobId: payload?.jobId };
    setRouteState(next);
    window.location.hash = buildHash(key, payload);
  };

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

  useEffect(() => {
    const handleHashChange = () => {
      setRouteState(parseHash());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <PresetsContext.Provider value={{ presets, loading: loadingPresets, error: presetError }}>
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 pb-[env(safe-area-inset-bottom)] pt-6">
        <header className="flex flex-wrap items-center gap-2">
          {navRoutes.map((key) => (
            <Button key={key} onClick={() => handleNavigate(key)}>
              {ru.routes[key]}
            </Button>
          ))}
        </header>
        <Active onNavigate={handleNavigate} jobId={routeState.jobId} />
      </div>
    </PresetsContext.Provider>
  );
}
