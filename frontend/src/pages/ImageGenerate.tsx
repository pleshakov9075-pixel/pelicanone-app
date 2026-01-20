import { useEffect, useMemo, useState } from "react";
import { hasTelegramInitData } from "../api/client";
import { createJob, getJobDetail, listJobs, type Job, type JobDetail } from "../api/jobs";
import { GenerationForm, GenerationParams } from "../components/GenerationForm";
import { JobCard } from "../components/JobCard";
import { ResultPanel } from "../components/ResultPanel";
import { usePresets } from "../app/presets";
import type { Preset } from "../api/presets";
import { formatStatus, formatSeconds, ru } from "../i18n/ru";
import { NavHandler } from "./types";

export function ImageGenerate({ onNavigate }: { onNavigate: NavHandler }) {
  const { presets, loading, error: presetsError } = usePresets();
  const [phase, setPhase] = useState<
    "idle" | "submitting" | "processing" | "done" | "failed"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeEtaSeconds, setActiveEtaSeconds] = useState<number | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<JobDetail | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const storedJobId = localStorage.getItem("last_job_id");
    listJobs()
      .then((data) => {
        setJobs(data.items);
        if (storedJobId) {
          setActiveJobId(storedJobId);
        } else if (data.items.length > 0) {
          setActiveJobId(data.items[0].id);
        }
      })
      .catch(() => setJobs([]));
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
      localStorage.setItem("last_job_id", job.id);
      setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]);
      setActiveJobId(job.id);
      setActiveJob(job);
      setJobError(null);
      setPhase("processing");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "Not enough credits.") {
        setError(ru.errors.insufficientFunds);
      } else if (message === "telegram_initdata_missing") {
        setError(ru.messages.telegramInitDataMissing);
      } else {
        setError(ru.errors.generationFailed);
      }
      setPhase("failed");
    }
  };

  useEffect(() => {
    if (!activeJobId) {
      return;
    }
    let timer: number | undefined;
    let timeoutTimer: number | undefined;

    const fetchJob = async () => {
      try {
        setIsPolling(true);
        const response = await getJobDetail(activeJobId);
        if (!response.ok) {
          if (response.statusCode === 404) {
            setJobError(ru.messages.jobNotFound);
            setIsPolling(false);
            return;
          }
          throw new Error(response.error);
        }
        setActiveJob(response.job);
        setJobError(null);
        setJobs((current) =>
          current.map((item) => (item.id === response.job.id ? { ...item, ...response.job } : item))
        );
        if (response.job.status === "done" || response.job.status === "error") {
          setIsPolling(false);
          setPhase(response.job.status === "done" ? "done" : "failed");
          if (timer) {
            window.clearInterval(timer);
          }
          if (timeoutTimer) {
            window.clearTimeout(timeoutTimer);
          }
        } else {
          setPhase("processing");
        }
      } catch {
        setJobError(ru.errors.requestFailed);
        setIsPolling(false);
      }
    };

    fetchJob();
    timer = window.setInterval(fetchJob, 2500);
    timeoutTimer = window.setTimeout(() => {
      setIsPolling(false);
      if (timer) {
        window.clearInterval(timer);
      }
    }, 180 * 1000);

    return () => {
      if (timer) {
        window.clearInterval(timer);
      }
      if (timeoutTimer) {
        window.clearTimeout(timeoutTimer);
      }
    };
  }, [activeJobId]);

  useEffect(() => {
    if (!activeJob?.created_at || activeJob.status !== "processing") {
      setElapsedSeconds(0);
      return;
    }
    const start = new Date(activeJob.created_at).getTime();
    const tick = () => {
      const now = Date.now();
      if (Number.isNaN(start)) {
        setElapsedSeconds(0);
      } else {
        setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
      }
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [activeJob?.created_at, activeJob?.status]);

  const statusLine = useMemo(() => {
    if (!activeJob) {
      return null;
    }
    if (activeJob.status === "processing") {
      return `${formatStatus(activeJob.status)} · ${formatSeconds(elapsedSeconds)}`;
    }
    return formatStatus(activeJob.status);
  }, [activeJob, elapsedSeconds]);

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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">{ru.titles.history}</h3>
            <button className="text-sm text-blue-600" onClick={() => onNavigate("history")}>
              {ru.actions.toHistory}
            </button>
          </div>
          {jobs.length === 0 ? <div className="text-sm text-slate-500">{ru.messages.noJobs}</div> : null}
          <div className="flex flex-col gap-2">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onSelect={(id) => setActiveJobId(id)} />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border p-3 text-sm text-slate-600">
            {jobError ? jobError : statusLine ? `${ru.labels.status}: ${statusLine}` : ru.labels.waiting}
          </div>
          {activeJob?.status === "error" ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {activeJob.error ?? ru.errors.generationFailed}
            </div>
          ) : null}
          <ResultPanel
            status={activeJob?.status}
            result={activeJob?.result ?? null}
            error={jobError}
            isLoading={isPolling}
          />
        </div>
      </div>
    </div>
  );
}
