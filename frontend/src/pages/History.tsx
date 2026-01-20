import { useEffect, useState } from "react";
import { Job, listJobs } from "../api/jobs";
import { JobCard } from "../components/JobCard";
import { ru } from "../i18n/ru";

import { NavHandler } from "./types";

export function History({ onNavigate: _onNavigate }: { onNavigate?: NavHandler }) {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    listJobs().then((data) => setJobs(data.items)).catch(() => setJobs([]));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{ru.titles.history}</h2>
      {jobs.length === 0 ? <div>{ru.messages.noJobs}</div> : null}
      <div className="flex flex-col gap-2">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
