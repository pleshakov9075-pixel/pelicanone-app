import { useEffect, useMemo, useState } from "react";
import { getJob, Job } from "../api/jobs";
import { NavHandler } from "./types";

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  if (minutes === 0) {
    return `${remainingSeconds} сек`;
  }
  if (remainingSeconds === 0) {
    return `${minutes} мин`;
  }
  return `${minutes} мин ${remainingSeconds} сек`;
}

export function JobStatus({ onNavigate }: { onNavigate: NavHandler }) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localStart, setLocalStart] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const jobId = localStorage.getItem("last_job_id");
    if (!jobId) {
      setError("Job not found");
      return;
    }
    let timer: number | undefined;

    const fetchJob = async () => {
      try {
        const data = await getJob(jobId);
        setJob(data);
        if (["succeeded", "failed", "canceled"].includes(data.status)) {
          if (timer) {
            window.clearInterval(timer);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "error");
      }
    };

    fetchJob();
    timer = window.setInterval(fetchJob, 1500);

    return () => {
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, []);

  useEffect(() => {
    if (!job) {
      return;
    }
    if (job.status === "queued" || job.status === "running") {
      const startedAt = job.started_at ? Date.parse(job.started_at) : null;
      setLocalStart(startedAt ?? Date.now());
    } else {
      setLocalStart(null);
    }
  }, [job?.id, job?.status, job?.started_at]);

  useEffect(() => {
    if (!localStart) {
      return;
    }
    const interval = window.setInterval(() => setTick((prev) => prev + 1), 1000);
    return () => window.clearInterval(interval);
  }, [localStart]);

  const etaDisplay = useMemo(() => {
    if (!job?.eta_seconds || !localStart) {
      return null;
    }
    const elapsedSeconds = Math.floor((Date.now() - localStart) / 1000);
    const remaining = Math.max(job.eta_seconds - elapsedSeconds, 0);
    return { remaining, elapsed: elapsedSeconds };
  }, [job?.eta_seconds, localStart, tick]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Статус задачи</h2>
      {error ? <div className="text-red-500">{error}</div> : null}
      {job ? (
        <div className="rounded-lg border p-4">
          <div>ID: {job.id}</div>
          <div>Статус: {job.status}</div>
          {job.eta_seconds && (job.status === "queued" || job.status === "running") ? (
            <div className="mt-2 text-sm text-slate-600">
              <div>
                Примерное время: ~{formatDuration(job.eta_seconds)}
              </div>
              {etaDisplay ? (
                <div>Осталось примерно: {formatDuration(etaDisplay.remaining)}</div>
              ) : null}
              <div className="text-xs text-slate-500">
                Время примерное, зависит от нагрузки.
              </div>
            </div>
          ) : null}
          {job.result?.files && Array.isArray(job.result.files) && job.result.files.length > 0 ? (
            <a className="text-blue-600" href={job.result.files[0]} target="_blank" rel="noreferrer">
              Открыть результат
            </a>
          ) : null}
        </div>
      ) : null}
      <button className="text-blue-600" onClick={() => onNavigate("history")}>К истории</button>
    </div>
  );
}
