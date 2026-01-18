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
  fields: PresetField[];
};

export async function getPresets() {
  return apiFetch<{ items: Preset[] }>("/presets");
}
