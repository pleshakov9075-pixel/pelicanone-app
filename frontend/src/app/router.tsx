import { useState } from "react";
import { Balance } from "../pages/Balance";
import { History } from "../pages/History";
import { Home } from "../pages/Home";
import { ImageGenerate } from "../pages/ImageGenerate";
import { JobStatus } from "../pages/JobStatus";
import { Button } from "../components/ui/button";

const routes = {
  home: Home,
  generate: ImageGenerate,
  status: JobStatus,
  history: History,
  balance: Balance
};

export type RouteKey = keyof typeof routes;

export function AppRouter() {
  const [route, setRoute] = useState<RouteKey>("home");
  const Active = routes[route];

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-wrap gap-2">
        {Object.keys(routes).map((key) => (
          <Button key={key} onClick={() => setRoute(key as RouteKey)}>
            {key}
          </Button>
        ))}
      </header>
      <Active onNavigate={setRoute} />
    </div>
  );
}
