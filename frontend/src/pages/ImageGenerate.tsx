import { useEffect, useMemo, useState } from "react";
import { createJob } from "../api/jobs";
import { GenerationForm, GenerationParams } from "../components/GenerationForm";
import { usePresets } from "../app/presets";
import type { Preset } from "../api/presets";
import { NavHandler } from "./types";

export function ImageGenerate({ onNavigate }: { onNavigate: NavHandler }) {
  const { presets, loading, error: presetsError } = usePresets();
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<unknown | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("last_job_result");
    if (!stored) {
      return;
    }
    try {
      setLastResult(JSON.parse(stored));
    } catch {
      setLastResult(null);
    }
  }, []);

  const resultDisplay = useMemo(() => {
    if (!lastResult) {
      return null;
    }
    if (typeof lastResult === "string") {
      return { text: lastResult, files: [] };
    }
    if (typeof lastResult === "object" && lastResult !== null) {
      const payload = lastResult as { text?: string; files?: string[] };
      return { text: payload.text ?? "", files: payload.files ?? [] };
    }
    return null;
  }, [lastResult]);

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
      <div className="rounded-lg border p-4">
        <div className="mb-2 font-semibold">Результат</div>
        {resultDisplay?.text ? (
          <textarea
            className="mt-2 w-full rounded border p-2 text-sm"
            rows={6}
            readOnly
            value={resultDisplay.text}
          />
        ) : null}
        {resultDisplay?.files && resultDisplay.files.length > 0 ? (
          <div className="mt-2 flex flex-col gap-2">
            <a className="text-blue-600" href={resultDisplay.files[0]} target="_blank" rel="noreferrer">
              {resultDisplay.files[0]}
            </a>
            <a
              className="inline-flex w-fit rounded bg-blue-600 px-3 py-1 text-white"
              href={resultDisplay.files[0]}
              target="_blank"
              rel="noreferrer"
            >
              Открыть
            </a>
          </div>
        ) : null}
        {!resultDisplay ? (
          <div className="text-sm text-slate-500">
            Результат появится после завершения последней генерации.
          </div>
        ) : null}
      </div>
    </div>
  );
}
