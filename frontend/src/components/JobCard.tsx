import { Job } from "../api/jobs";

export function JobCard({ job }: { job: Job }) {
  const fileItem =
    job.result?.items?.find((item) => item.kind === "file" && item.url) ?? null;
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-gray-500">{job.id}</div>
      <div className="font-semibold">{job.type}</div>
      <div>Status: {job.status}</div>
      {fileItem ? (
        <a className="text-blue-600" href={fileItem.url} target="_blank" rel="noreferrer">
          Result file
        </a>
      ) : null}
    </div>
  );
}
