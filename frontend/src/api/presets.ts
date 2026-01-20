import { apiFetch } from "./client";

export type PresetField = {
  name: string;
  label: string;
  type: "string" | "number" | "boolean";
  required: boolean;
  default?: string | number | boolean | null;
  enum?: Array<string | number>;
};

export type Preset = {
  id: string;
  label: string;
  job_type: string;
  network_id: string;
  price_rub: number;
  eta_seconds?: number | null;
  poll_interval_seconds?: number | null;
  timeout_seconds?: number | null;
  fields: PresetField[];
};

export async function getPresets() {
  return apiFetch<{ items: Preset[] }>("/presets");
}
