import { useEffect, useState } from "react";
import { createJob, getJob, getJobResult, type JobResultPayload, type JobStatus } from "../api/jobs";
import { GenerationForm, GenerationParams } from "../components/GenerationForm";
import { ResultPanel } from "../components/ResultPanel";
import { usePresets } from "../app/presets";
import type { Preset } from "../api/presets";
import { NavHandler } from "./types";

export function ImageGenerate({ onNavigate }: { onNavigate: NavHandler }) {
  const { presets, loading, error: presetsError } = usePresets();
  const devEnabled = import.meta.env.VITE_DEV_AUTH === "true";
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [jobResult, setJobResult] = useState<JobResultPayload | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);

  useEffect(() => {
    setJobId(localStorage.getItem("last_job_id"));
    const storedResult = localStorage.getItem("last_job_result");
    if (storedResult) {
      try {
        setJobResult(JSON.parse(storedResult) as JobResultPayload);
      } catch {
        setJobResult(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!jobId) {
      return;
    }
    let timer: number | undefined;
    let timeoutTimer: number | undefined;

    const poll = async () => {
      try {
        setIsPolling(true);
        const status = await getJob(jobId);
        setJobStatus(status);
        if (status.result) {
          setJobResult(status.result);
          localStorage.setItem("last_job_result", JSON.stringify(status.result));
        }
        if (status.status === "finished" || status.status === "failed") {
          if (!status.result && status.status === "finished") {
            const result = await getJobResult(jobId);
            if (result.result) {
              setJobResult(result.result as JobResultPayload);
              localStorage.setItem("last_job_result", JSON.stringify(result.result));
            }
            if (result.error) {
              setResultError(result.error);
            }
          }
          if (timer) {
            window.clearInterval(timer);
          }
          if (timeoutTimer) {
            window.clearTimeout(timeoutTimer);
          }
          setIsPolling(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "error");
      }
    };

    poll();
    timer = window.setInterval(poll, 1500);
    timeoutTimer = window.setTimeout(() => {
      setIsTimeout(true);
      if (timer) {
        window.clearInterval(timer);
      }
      setIsPolling(false);
    }, 2.5 * 60 * 1000);

    return () => {
      if (timer) {
        window.clearInterval(timer);
      }
      if (timeoutTimer) {
        window.clearTimeout(timeoutTimer);
      }
    };
  }, [jobId]);

  const handleSubmit = async (preset: Preset, data: GenerationParams) => {
    setError(null);
    setResultError(null);
    setIsTimeout(false);
    setJobResult(null);
    try {
      const job = await createJob({
        type: preset.job_type,
        payload: {
          network_id: preset.network_id,
          params: data
        }
      });
      setJobId(job.id);
      setJobStatus({ status: "queued" });
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          {presets.length === 0 ? (
            <div>Пресеты не найдены</div>
          ) : (
            <GenerationForm presets={presets} onSubmit={handleSubmit} />
          )}
          {jobId ? (
            <div className="rounded-lg border p-4 text-sm text-slate-500">
              Последняя задача: {jobId}
            </div>
          ) : null}
          {isTimeout ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Задача выполняется слишком долго. Обновите статус или попробуйте позже.
            </div>
          ) : null}
        </div>
        <ResultPanel
          status={jobStatus?.status}
          result={jobResult}
          error={resultError}
          isLoading={isPolling}
          debug={
            jobResult?.raw && devEnabled && localStorage.getItem("dev_mode") === "true"
              ? jobResult.raw
              : null
          }
        />
      </div>
      <button className="text-blue-600" onClick={() => onNavigate("history")}>
        К истории
      </button>
    </div>
  );
}
