import { useEffect, useState } from "react";
import { getJob, Job } from "../api/jobs";
import { NavHandler } from "./types";

export function JobStatus({ onNavigate }: { onNavigate: NavHandler }) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Статус задачи</h2>
      {error ? <div className="text-red-500">{error}</div> : null}
      {job ? (
        <div className="rounded-lg border p-4">
          <div>ID: {job.id}</div>
          <div>Статус: {job.status}</div>
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
