import { useEffect, useMemo, useState } from "react";
import {
  createJob,
  getJobResult,
  getJobStatus,
  type JobResultPayload,
  type JobStatus
} from "../api/jobs";
import { GenerationForm, GenerationParams } from "../components/GenerationForm";
import { ResultPanel } from "../components/ResultPanel";
import { usePresets } from "../app/presets";
import type { Preset } from "../api/presets";
import { ru } from "../i18n/ru";
import { NavHandler } from "./types";

export function ImageGenerate({ onNavigate }: { onNavigate: NavHandler }) {
  const { presets, loading, error: presetsError } = usePresets();
  const devEnabled = import.meta.env.VITE_DEV_AUTH === "true";
  const [phase, setPhase] = useState<"idle" | "submitting" | "running" | "done" | "failed">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [jobResult, setJobResult] = useState<JobResultPayload | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeEtaSeconds, setActiveEtaSeconds] = useState<number | null>(null);
  const [isResultPolling, setIsResultPolling] = useState(false);
  const isLoading = useMemo(
    () => ["submitting", "running"].includes(phase) || isResultPolling,
    [phase, isResultPolling]
  );

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
    if (!jobId || phase !== "running") {
      return;
    }
    let timer: number | undefined;
    let timeoutTimer: number | undefined;

    const poll = async () => {
      try {
        const response = await getJobStatus(jobId);
        if (!response.ok) {
          if (response.statusCode === 404) {
            if (timer) {
              window.clearInterval(timer);
            }
            if (timeoutTimer) {
              window.clearTimeout(timeoutTimer);
            }
            setJobStatus(null);
            setJobResult(null);
            setJobId(null);
            setPhase("idle");
            setError(null);
            setResultError(null);
            localStorage.removeItem("last_job_id");
            return;
          }
          throw new Error(response.error);
        }
        const status = response.status;
        setJobStatus(status);
        if (status.result) {
          setJobResult(status.result);
          localStorage.setItem("last_job_result", JSON.stringify(status.result));
        }
        if (status.status === "finished" || status.status === "failed") {
          if (timer) {
            window.clearInterval(timer);
          }
          if (timeoutTimer) {
            window.clearTimeout(timeoutTimer);
          }
          setPhase(status.status === "failed" ? "failed" : "done");
        }
      } catch (err) {
        setError(ru.errors.generationFailed);
        setPhase("failed");
      }
    };

    poll();
    timer = window.setInterval(poll, 1500);
    timeoutTimer = window.setTimeout(() => {
      setIsTimeout(true);
      if (timer) {
        window.clearInterval(timer);
      }
      setPhase("failed");
    }, 2.5 * 60 * 1000);

    return () => {
      if (timer) {
        window.clearInterval(timer);
      }
      if (timeoutTimer) {
        window.clearTimeout(timeoutTimer);
      }
    };
  }, [jobId, phase]);

  useEffect(() => {
    if (!jobId || !jobStatus || jobResult) {
      return;
    }
    if (!["finished", "failed"].includes(jobStatus.status)) {
      return;
    }
    let timer: number | undefined;
    let timeoutTimer: number | undefined;
    const startedPollingAt = Date.now();

    const fetchResult = async () => {
      const result = await getJobResult(jobId);
      if (result.httpStatus === 404) {
        setJobStatus(null);
        setJobResult(null);
        setJobId(null);
        setPhase("idle");
        setIsResultPolling(false);
        localStorage.removeItem("last_job_id");
        return;
      }
      const payload = result.result as JobResultPayload | undefined;
      if (payload) {
        setJobResult(payload);
        localStorage.setItem("last_job_result", JSON.stringify(payload));
        setIsResultPolling(false);
        if (timer) {
          window.clearInterval(timer);
        }
        if (timeoutTimer) {
          window.clearTimeout(timeoutTimer);
        }
        return;
      }
      if (result.error) {
        setResultError(ru.errors.generationFailed);
      }
      if (Date.now() - startedPollingAt >= 120 * 1000) {
        setIsTimeout(true);
        setIsResultPolling(false);
        setPhase("failed");
        if (timer) {
          window.clearInterval(timer);
        }
        if (timeoutTimer) {
          window.clearTimeout(timeoutTimer);
        }
      }
    };

    setIsResultPolling(true);
    fetchResult().catch(() => {
      setResultError(ru.errors.generationFailed);
      setIsResultPolling(false);
    });
    timer = window.setInterval(fetchResult, 1500);
    timeoutTimer = window.setTimeout(() => {
      setIsTimeout(true);
      setIsResultPolling(false);
      setPhase("failed");
      if (timer) {
        window.clearInterval(timer);
      }
    }, 120 * 1000);

    return () => {
      if (timer) {
        window.clearInterval(timer);
      }
      if (timeoutTimer) {
        window.clearTimeout(timeoutTimer);
      }
    };
  }, [jobId, jobStatus, jobResult]);

  useEffect(() => {
    if (!startedAt || !["submitting", "running"].includes(phase)) {
      return;
    }
    const updateElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    };
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [phase, startedAt]);

  const handleSubmit = async (preset: Preset, data: GenerationParams) => {
    setError(null);
    setResultError(null);
    setIsTimeout(false);
    setJobResult(null);
    setJobStatus(null);
    setElapsedSeconds(0);
    setStartedAt(Date.now());
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
      setJobId(job.id);
      setJobStatus({ status: "queued" });
      setPhase("running");
      localStorage.setItem("last_job_id", job.id);
    } catch (err) {
      setError(ru.errors.generationFailed);
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          {presets.length === 0 ? (
            <div>{ru.messages.presetsMissing}</div>
          ) : (
            <GenerationForm
              presets={presets}
              onSubmit={handleSubmit}
              phase={phase}
              elapsedSeconds={elapsedSeconds}
              activeEtaSeconds={activeEtaSeconds}
            />
          )}
          {jobId ? (
            <div className="rounded-lg border p-4 text-sm text-slate-500">
              {ru.labels.lastJob}: {jobId}
            </div>
          ) : null}
          {isTimeout ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {ru.messages.jobTimeout}
            </div>
          ) : null}
        </div>
        <ResultPanel
          status={jobStatus?.status}
          result={jobResult}
          error={resultError}
          isLoading={isLoading}
          debug={
            jobResult?.raw && devEnabled && localStorage.getItem("dev_mode") === "true"
              ? jobResult.raw
              : null
          }
        />
      </div>
      <button className="text-blue-600" onClick={() => onNavigate("history")}>
        {ru.actions.toHistory}
      </button>
    </div>
  );
}
