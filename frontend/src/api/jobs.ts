import { apiFetch, API_BASE, getAuthToken } from "./client";

export type Job = {
  id: string;
  type: string;
  status: string;
  provider: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  cost: number;
  eta_seconds?: number | null;
  started_at?: string | null;
  finished_at?: string | null;
  queue_position?: number | null;
};

export type JobStatus = {
  status: string;
  error?: string | null;
};

export type JobResult = {
  status: string;
  result?: unknown;
  error?: string | null;
};

export async function createJob(payload: { type: string; payload: Record<string, unknown> }) {
  return apiFetch<Job>("/jobs", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getJob(id: string) {
  return apiFetch<JobStatus>(`/jobs/${id}`);
}

export async function listJobs() {
  return apiFetch<{ items: Job[]; total: number }>("/jobs?mine=1");
}

export async function getJobResult(id: string): Promise<JobResult> {
  const headers = new Headers();
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE}/jobs/${id}/result`, { headers });
  const text = await response.text();
  let payload: JobResult = { status: "unknown" };
  if (text) {
    try {
      payload = JSON.parse(text) as JobResult;
    } catch {
      payload = { status: "unknown", error: text };
    }
  }
  if (!response.ok) {
    return {
      status: payload.status ?? "failed",
      error: payload.error ?? text || "request_failed"
    };
  }
  return payload;
}
