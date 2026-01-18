import { useState } from "react";
import { Button } from "./ui/button";

const styles = ["photoreal", "anime", "3d", "sketch"];

export type GenerationPayload = {
  prompt: string;
  negative_prompt?: string;
  size: string;
  steps: number;
  seed?: number;
  style: string;
};

export function GenerationForm({ onSubmit }: { onSubmit: (data: GenerationPayload) => void }) {
  const [form, setForm] = useState<GenerationPayload>({
    prompt: "",
    negative_prompt: "",
    size: "1024x1024",
    steps: 30,
    seed: undefined,
    style: styles[0]
  });

  return (
    <form
      className="flex flex-col gap-4 rounded-lg border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      <label className="flex flex-col gap-2">
        <span>Prompt</span>
        <input
          className="rounded border p-2"
          value={form.prompt}
          onChange={(event) => setForm({ ...form, prompt: event.target.value })}
          required
        />
      </label>
      <label className="flex flex-col gap-2">
        <span>Negative prompt</span>
        <input
          className="rounded border p-2"
          value={form.negative_prompt}
          onChange={(event) => setForm({ ...form, negative_prompt: event.target.value })}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span>Size</span>
        <select
          className="rounded border p-2"
          value={form.size}
          onChange={(event) => setForm({ ...form, size: event.target.value })}
        >
          <option value="512x512">512x512</option>
          <option value="768x768">768x768</option>
          <option value="1024x1024">1024x1024</option>
        </select>
      </label>
      <label className="flex flex-col gap-2">
        <span>Steps</span>
        <input
          className="rounded border p-2"
          type="number"
          min={10}
          max={80}
          value={form.steps}
          onChange={(event) => setForm({ ...form, steps: Number(event.target.value) })}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span>Seed (optional)</span>
        <input
          className="rounded border p-2"
          type="number"
          value={form.seed ?? ""}
          onChange={(event) =>
            setForm({
              ...form,
              seed: event.target.value ? Number(event.target.value) : undefined
            })
          }
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {styles.map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => setForm({ ...form, style })}
            className={`rounded border px-3 py-2 ${form.style === style ? "bg-black text-white" : ""}`}
          >
            {style}
          </button>
        ))}
      </div>
      <Button type="submit">Сгенерировать</Button>
    </form>
  );
}
