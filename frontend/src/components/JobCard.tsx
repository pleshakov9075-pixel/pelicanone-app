import { Job } from "../api/jobs";
import { formatJobType, formatStatus, ru } from "../i18n/ru";

type JobCardProps = {
  job: Job;
  onSelect?: (jobId: string) => void;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ru-RU");
}

export function JobCard({ job, onSelect }: JobCardProps) {
  return (
    <button
      className="rounded-lg border p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
      type="button"
      onClick={() => onSelect?.(job.id)}
    >
      <div className="text-sm text-gray-500">{job.id.slice(0, 8)}</div>
      <div className="font-semibold">{formatJobType(job.kind)}</div>
      <div>
        {ru.labels.status}: {formatStatus(job.status)}
      </div>
      <div className="text-sm text-gray-500">{formatDateTime(job.created_at)}</div>
    </button>
  );
}
