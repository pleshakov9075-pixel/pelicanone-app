import type { RouteKey } from "../app/router";

export type NavHandler = (route: RouteKey, payload?: { jobId?: string | null }) => void;
