import { useState } from "react";
import { createJob } from "../api/jobs";
import { GenerationForm, GenerationParams } from "../components/GenerationForm";
import { usePresets } from "../app/presets";
import type { Preset } from "../api/presets";
import { NavHandler } from "./types";

export function ImageGenerate({ onNavigate }: { onNavigate: NavHandler }) {
  const { presets, loading, error: presetsError } = usePresets();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (preset: Preset, data: GenerationParams) => {
    setError(null);
    try {
      const job = await createJob({
        type: preset.job_type,
        payload: {
          network_id: preset.network_id,
          params: data
        }
      });
      onNavigate("status");
      localStorage.setItem("last_job_id", job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    }
  };

  if (loading) {
    return <div>Загрузка пресетов...</div>;
  }

  if (presetsError) {
    return <div className="text-red-500">{presetsError}</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Генерация</h2>
      {error ? <div className="text-red-500">{error}</div> : null}
      {presets.length === 0 ? (
        <div>Пресеты не найдены</div>
      ) : (
        <GenerationForm presets={presets} onSubmit={handleSubmit} />
      )}
    </div>
  );
}
