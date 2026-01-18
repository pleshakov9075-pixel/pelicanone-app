import { Job } from "../api/jobs";

export function JobCard({ job }: { job: Job }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-gray-500">{job.id}</div>
      <div className="font-semibold">{job.type}</div>
      <div>Status: {job.status}</div>
      {job.result?.files && Array.isArray(job.result.files) && job.result.files.length > 0 ? (
        <a className="text-blue-600" href={job.result.files[0]} target="_blank" rel="noreferrer">
          Result file
        </a>
      ) : null}
    </div>
  );
}
