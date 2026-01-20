import { useEffect, useState } from "react";
import { getJob, getJobResult, type JobResultPayload, type JobStatus } from "../api/jobs";
import { NavHandler } from "./types";
import { ResultPanel } from "../components/ResultPanel";

export function JobStatus({ onNavigate }: { onNavigate: NavHandler }) {
  const devEnabled = import.meta.env.VITE_DEV_AUTH === "true";
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [jobResult, setJobResult] = useState<JobResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  useEffect(() => {
    const storedJobId = localStorage.getItem("last_job_id");
    if (!storedJobId) {
      setError("Job not found");
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
        const data = await getJob(jobId);
        setJobStatus(data);
        if (data.result) {
          setJobResult(data.result);
          localStorage.setItem("last_job_result", JSON.stringify(data.result));
        }
        if (["finished", "failed"].includes(data.status)) {
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
  }, [jobId]);

  useEffect(() => {
    if (!jobId || !jobStatus || jobResult) {
      return;
    }
    if (!["finished", "failed"].includes(jobStatus.status)) {
      return;
    }
    const fetchResult = async () => {
      const result = await getJobResult(jobId);
      const payload = result.result as JobResultPayload | undefined;
      if (payload) {
        setJobResult(payload);
        localStorage.setItem("last_job_result", JSON.stringify(payload));
      }
      if (result.error) {
        setResultError(result.error);
      }
    };
    fetchResult().catch((err) => {
      setResultError(err instanceof Error ? err.message : "error");
    });
  }, [jobId, jobResult, jobStatus]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Статус задачи</h2>
      {error ? <div className="text-red-500">{error}</div> : null}
      {jobId && jobStatus ? (
        <div className="rounded-lg border p-4">
          <div>ID: {jobId}</div>
          <div>Статус: {jobStatus.status}</div>
          {jobStatus.error ? <div className="mt-2 text-red-500">{jobStatus.error}</div> : null}
        </div>
      ) : null}
      <ResultPanel
        status={jobStatus?.status}
        result={jobResult}
        error={resultError}
        isLoading={jobStatus ? !["finished", "failed"].includes(jobStatus.status) : false}
        debug={
          jobResult?.raw && devEnabled && localStorage.getItem("dev_mode") === "true"
            ? jobResult.raw
            : null
        }
      />
      <button className="text-blue-600" onClick={() => onNavigate("history")}>К истории</button>
    </div>
  );
}
