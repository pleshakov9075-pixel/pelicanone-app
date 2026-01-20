import { Job } from "../api/jobs";
import { formatJobType, formatStatus, ru } from "../i18n/ru";

export function JobCard({ job }: { job: Job }) {
  const fileItem =
    job.result?.items?.find((item) => item.kind === "file" && item.url) ?? null;
  const isExternalLink = (() => {
    if (!fileItem?.url) {
      return false;
    }
    if (fileItem.url.startsWith("/media/")) {
      return false;
    }
    try {
      return new URL(fileItem.url, window.location.origin).origin !== window.location.origin;
    } catch {
      return false;
    }
  })();
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-gray-500">{job.id}</div>
      <div className="font-semibold">{formatJobType(job.type)}</div>
      <div>
        {ru.labels.status}: {formatStatus(job.status)}
      </div>
      {fileItem ? (
        <div className="flex items-center gap-2">
          <a className="text-blue-600" href={fileItem.url} target="_blank" rel="noreferrer">
            {ru.actions.open}
          </a>
          {isExternalLink ? (
            <span className="text-xs text-amber-600">{ru.labels.externalLink}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
