import { useEffect, useState } from "react";
import {
  getJobResult,
  getJobStatus,
  type JobResultPayload,
  type JobStatus
} from "../api/jobs";
import { NavHandler } from "./types";
import { ResultPanel } from "../components/ResultPanel";
import { formatStatus, ru } from "../i18n/ru";

export function JobStatus({ onNavigate }: { onNavigate: NavHandler }) {
  const devEnabled = import.meta.env.VITE_DEV_AUTH === "true";
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [jobResult, setJobResult] = useState<JobResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isResultPolling, setIsResultPolling] = useState(false);

  useEffect(() => {
    const storedJobId = localStorage.getItem("last_job_id");
    if (!storedJobId) {
      setError(ru.messages.jobNotFound);
      return;
    }
    setJobId(storedJobId);
  }, []);

  useEffect(() => {
    if (!jobId) {
      return;
    }
    let timer: number | undefined;

    const fetchJob = async () => {
      try {
        setIsPolling(true);
        const response = await getJobStatus(jobId);
        if (!response.ok) {
          if (response.statusCode === 404) {
            setError(ru.messages.jobNotFound);
            setIsPolling(false);
            if (timer) {
              window.clearInterval(timer);
            }
            return;
          }
          throw new Error(response.error);
        }
        const data = response.status;
        setJobStatus(data);
        if (data.result) {
          setJobResult(data.result);
          localStorage.setItem("last_job_result", JSON.stringify(data.result));
        }
        if (["finished", "failed"].includes(data.status)) {
          if (timer) {
            window.clearInterval(timer);
          }
          setIsPolling(false);
        }
      } catch (err) {
        setError(ru.errors.generationFailed);
        setIsPolling(false);
      }
    };

    fetchJob();
    timer = window.setInterval(fetchJob, 1500);

    return () => {
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, [jobId]);

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
        setError(ru.messages.jobNotFound);
        setIsResultPolling(false);
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
        setIsResultPolling(false);
        setResultError(ru.messages.jobTimeout);
      }
    };

    setIsResultPolling(true);
    fetchResult().catch(() => {
      setResultError(ru.errors.generationFailed);
      setIsResultPolling(false);
    });
    timer = window.setInterval(fetchResult, 1500);
    timeoutTimer = window.setTimeout(() => {
      setIsResultPolling(false);
      setResultError(ru.messages.jobTimeout);
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
  }, [jobId, jobResult, jobStatus]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{ru.titles.status}</h2>
      {error ? <div className="text-red-500">{error}</div> : null}
      {jobId && jobStatus ? (
        <div className="rounded-lg border p-4">
          <div>
            {ru.labels.id}: {jobId}
          </div>
          <div>
            {ru.labels.status}: {formatStatus(jobStatus.status)}
          </div>
          {jobStatus.error ? <div className="mt-2 text-red-500">{jobStatus.error}</div> : null}
        </div>
      ) : null}
      <ResultPanel
        status={jobStatus?.status}
        result={jobResult}
        error={resultError}
        isLoading={isPolling || isResultPolling}
        debug={
          jobResult?.raw && devEnabled && localStorage.getItem("dev_mode") === "true"
            ? jobResult.raw
            : null
        }
      />
      <button className="text-blue-600" onClick={() => onNavigate("history")}>
        {ru.actions.toHistory}
      </button>
    </div>
  );
}
