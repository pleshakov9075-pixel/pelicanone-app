import { apiFetch } from "./client";

export type Job = {
  id: string;
  type: string;
  status: string;
  provider: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  cost: number;
};

export async function createJob(payload: { type: string; payload: Record<string, unknown> }) {
  return apiFetch<Job>("/jobs", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getJob(id: string) {
  return apiFetch<Job>(`/jobs/${id}`);
}

export async function listJobs() {
  return apiFetch<{ items: Job[]; total: number }>("/jobs?mine=1");
}
