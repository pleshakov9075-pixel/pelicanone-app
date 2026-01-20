import { apiFetch, API_BASE, getAuthToken } from "./client";

export type Job = {
  id: string;
  type: string;
  status: string;
  provider: string;
  payload: Record<string, unknown>;
  result?: JobResultPayload | null;
  cost: number;
  eta_seconds?: number | null;
  started_at?: string | null;
  finished_at?: string | null;
  queue_position?: number | null;
};

export type JobStatus = {
  status: string;
  error?: string | null;
  result?: JobResultPayload | null;
  progress?: number | null;
};

export type JobResult = {
  status: string;
  result?: unknown;
  error?: string | null;
};

export type JobStatusResponse =
  | { ok: true; status: JobStatus }
  | { ok: false; statusCode: number; error: string };

export type JobResultResponse = JobResult & { httpStatus: number };

export type ResultItem = {
  kind: "file" | "text";
  url?: string;
  filename?: string;
  content_type?: string;
  text?: string;
};

export type JobResultPayload = {
  type: "image" | "video" | "audio" | "text";
  items: ResultItem[];
  raw?: Record<string, unknown>;
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

export async function getJobStatus(id: string): Promise<JobStatusResponse> {
  const headers = new Headers();
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE}/jobs/${id}`, { headers });
  const text = await response.text();
  if (!response.ok) {
    return {
      ok: false,
      statusCode: response.status,
      error: text || "request_failed"
    };
  }
  return { ok: true, status: JSON.parse(text) as JobStatus };
}

export async function listJobs() {
  return apiFetch<{ items: Job[]; total: number }>("/jobs?mine=1");
}

export async function getJobResult(id: string): Promise<JobResultResponse> {
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
    const errorMessage = payload.error ?? text;
    return {
      status: payload.status ?? "failed",
      error: errorMessage || "request_failed",
      httpStatus: response.status
    };
  }
  return { ...payload, httpStatus: response.status };
}
