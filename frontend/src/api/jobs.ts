import {
  apiFetch,
  API_BASE,
  buildApiHeaders,
  getTelegramInitDataHeader
} from "./client";

export type Job = {
  id: string;
  kind: string;
  status: string;
  created_at: string;
};

export type JobDetail = {
  id: string;
  kind: string;
  status: string;
  created_at: string;
  params: Record<string, unknown>;
  result?: JobResultPayload | null;
  error?: string | null;
};

export type JobResult = {
  status: string;
  result?: unknown;
  error?: string | null;
};

export type JobDetailResponse =
  | { ok: true; job: JobDetail }
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
  return apiFetch<JobDetail>("/jobs", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getJobDetail(id: string): Promise<JobDetailResponse> {
  if (!getTelegramInitDataHeader()) {
    return { ok: false, statusCode: 401, error: "telegram_initdata_missing" };
  }
  const headers = buildApiHeaders();
  const response = await fetch(`${API_BASE}/jobs/${id}`, { headers });
  const text = await response.text();
  if (!response.ok) {
    return {
      ok: false,
      statusCode: response.status,
      error: text || "request_failed"
    };
  }
  return { ok: true, job: JSON.parse(text) as JobDetail };
}

export async function listJobs() {
  return apiFetch<{ items: Job[]; total: number }>("/jobs?mine=true");
}

export async function getJobResult(id: string): Promise<JobResultResponse> {
  if (!getTelegramInitDataHeader()) {
    return { status: "failed", error: "telegram_initdata_missing", httpStatus: 401 };
  }
  const headers = buildApiHeaders();
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
