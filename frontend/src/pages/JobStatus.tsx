import { useEffect, useMemo, useState } from "react";
import { getJob, getJobResult, JobResult, JobStatus } from "../api/jobs";
import { NavHandler } from "./types";

export function JobStatus({ onNavigate }: { onNavigate: NavHandler }) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [jobResult, setJobResult] = useState<JobResult | null>(null);
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
      setJobResult(result);
      if (result.error) {
        setResultError(result.error);
      }
      if (result.result) {
        localStorage.setItem("last_job_result", JSON.stringify(result.result));
      }
    };
    fetchResult().catch((err) => {
      setResultError(err instanceof Error ? err.message : "error");
    });
  }, [jobId, jobResult, jobStatus]);

  const resultDisplay = useMemo(() => {
    if (!jobResult?.result) {
      return null;
    }
    if (typeof jobResult.result === "string") {
      return { text: jobResult.result, files: [] };
    }
    if (typeof jobResult.result === "object" && jobResult.result !== null) {
      const payload = jobResult.result as { text?: string; files?: string[] };
      return { text: payload.text ?? "", files: payload.files ?? [] };
    }
    return null;
  }, [jobResult]);

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
      <div className="rounded-lg border p-4">
        <div className="mb-2 font-semibold">Результат</div>
        {resultError ? <div className="text-red-500">{resultError}</div> : null}
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
        {!resultDisplay && !resultError ? (
          <div className="text-sm text-slate-500">Ожидаем результат задачи...</div>
        ) : null}
      </div>
      <button className="text-blue-600" onClick={() => onNavigate("history")}>К истории</button>
    </div>
  );
}
