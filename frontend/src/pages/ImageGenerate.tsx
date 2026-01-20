import { useEffect, useState } from "react";
import { hasTelegramInitData } from "../api/client";
import { createJob } from "../api/jobs";
import { GenerationForm, GenerationParams } from "../components/GenerationForm";
import { usePresets } from "../app/presets";
import type { Preset } from "../api/presets";
import { ru } from "../i18n/ru";
import { NavHandler } from "./types";

export function ImageGenerate({ onNavigate }: { onNavigate: NavHandler }) {
  const { presets, loading, error: presetsError } = usePresets();
  const [phase, setPhase] = useState<
    "idle" | "submitting" | "running" | "done" | "failed"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [activeEtaSeconds, setActiveEtaSeconds] = useState<number | null>(null);

  useEffect(() => {
    setLastJobId(localStorage.getItem("last_job_id"));
  }, []);

  const handleSubmit = async (preset: Preset, data: GenerationParams) => {
    if (!hasTelegramInitData()) {
      setError(ru.messages.telegramInitDataMissing);
      setPhase("idle");
      return;
    }
    setError(null);
    setActiveEtaSeconds(preset.eta_seconds ?? null);
    setPhase("submitting");
    try {
      const job = await createJob({
        type: preset.job_type,
        payload: {
          network_id: preset.network_id,
          params: data
        }
      });
      setLastJobId(job.id);
      localStorage.setItem("last_job_id", job.id);
      onNavigate("job", { jobId: job.id });
      setPhase("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "insufficient_funds") {
        setError(ru.errors.insufficientFunds);
      } else if (message === "telegram_initdata_missing") {
        setError(ru.messages.telegramInitDataMissing);
      } else {
        setError(ru.errors.generationFailed);
      }
      setPhase("failed");
    }
  };

  if (loading) {
    return <div>{ru.messages.loadingPresets}</div>;
  }

  if (presetsError) {
    return <div className="text-red-500">{ru.messages.presetsLoadFailed}</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{ru.titles.generation}</h2>
      {error ? <div className="text-red-500">{error}</div> : null}
      <div className="flex flex-col gap-4">
        {presets.length === 0 ? (
          <div>{ru.messages.presetsMissing}</div>
        ) : (
          <GenerationForm
            presets={presets}
            onSubmit={handleSubmit}
            phase={phase}
            elapsedSeconds={0}
            activeEtaSeconds={activeEtaSeconds}
          />
        )}
        {lastJobId ? (
          <div className="rounded-lg border p-4 text-sm text-slate-500">
            {ru.labels.lastJob}: {lastJobId}
          </div>
        ) : null}
      </div>
      <button className="text-blue-600" onClick={() => onNavigate("history")}>
        {ru.actions.toHistory}
      </button>
    </div>
  );
}
