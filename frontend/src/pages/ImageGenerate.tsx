import { useState } from "react";
import { createJob } from "../api/jobs";
import { GenerationForm, GenerationPayload } from "../components/GenerationForm";
import { NavHandler } from "./types";

export function ImageGenerate({ onNavigate }: { onNavigate: NavHandler }) {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: GenerationPayload) => {
    setError(null);
    try {
      const job = await createJob({
        type: "image",
        payload: {
          network_id: "image-default",
          params: data
        }
      });
      onNavigate("status");
      localStorage.setItem("last_job_id", job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Image генерация</h2>
      {error ? <div className="text-red-500">{error}</div> : null}
      <GenerationForm onSubmit={handleSubmit} />
    </div>
  );
}
