import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Preset, PresetField } from "../api/presets";
import { Button } from "./ui/button";

export type GenerationParams = Record<string, string | number | boolean | undefined>;

type FieldValue = string | number | boolean | "";

function buildInitialValues(fields: PresetField[]): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};
  fields.forEach((field) => {
    if (field.default !== undefined && field.default !== null) {
      values[field.name] = field.default as FieldValue;
    } else if (field.type === "boolean") {
      values[field.name] = false;
    } else {
      values[field.name] = "";
    }
  });
  return values;
}

function isTextAreaField(field: PresetField) {
  return ["prompt", "text"].includes(field.name);
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  if (minutes === 0) {
    return `${remainingSeconds} сек`;
  }
  if (remainingSeconds === 0) {
    return `${minutes} мин`;
  }
  return `${minutes} мин ${remainingSeconds} сек`;
}

export function GenerationForm({
  presets,
  onSubmit
}: {
  presets: Preset[];
  onSubmit: (preset: Preset, params: GenerationParams) => void;
}) {
  const [selectedPresetId, setSelectedPresetId] = useState(presets[0]?.id ?? "");
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [selectedJobType, setSelectedJobType] = useState(presets[0]?.job_type ?? "");

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId),
    [presets, selectedPresetId]
  );

  const jobTypes = useMemo(() => Array.from(new Set(presets.map((preset) => preset.job_type))), [
    presets
  ]);

  useEffect(() => {
    if (presets.length > 0 && !selectedPresetId) {
      setSelectedPresetId(presets[0].id);
    }
  }, [presets, selectedPresetId]);

  useEffect(() => {
    if (selectedPreset) {
      setValues(buildInitialValues(selectedPreset.fields));
      setSelectedJobType(selectedPreset.job_type);
    }
  }, [selectedPreset]);

  if (!selectedPreset) {
    return null;
  }

  const requiredFields = selectedPreset.fields.filter((field) => field.required);
  const optionalFields = selectedPreset.fields.filter((field) => !field.required);
  const etaLabel = selectedPreset.eta_seconds
    ? `Ожидание ~ ${formatDuration(selectedPreset.eta_seconds)}`
    : null;

  const currentParams = useMemo(() => {
    const params: GenerationParams = {};
    selectedPreset.fields.forEach((field) => {
      const value = values[field.name];
      if (value === "" || value === undefined) {
        return;
      }
      params[field.name] = value as string | number | boolean;
    });
    return params;
  }, [selectedPreset.fields, values]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(selectedPreset, currentParams);
  };

  const renderField = (field: PresetField) => {
    const value = values[field.name];
    const commonProps = {
      id: field.name,
      name: field.name,
      required: field.required,
      className: "rounded border p-2"
    };

    if (field.type === "boolean") {
      return (
        <label key={field.name} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) =>
              setValues((current) => ({ ...current, [field.name]: event.target.checked }))
            }
          />
          <span>{field.label}</span>
        </label>
      );
    }

    if (field.enum && field.enum.length > 0) {
      return (
        <label key={field.name} className="flex flex-col gap-2">
          <span>{field.label}</span>
          <select
            {...commonProps}
            value={value === "" ? "" : String(value)}
            onChange={(event) => {
              const raw = event.target.value;
              const parsed = field.type === "number" ? Number(raw) : raw;
              setValues((current) => ({ ...current, [field.name]: parsed }));
            }}
          >
            {field.enum.map((option) => (
              <option key={String(option)} value={String(option)}>
                {String(option)}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (field.type === "number") {
      return (
        <label key={field.name} className="flex flex-col gap-2">
          <span>{field.label}</span>
          <input
            {...commonProps}
            type="number"
            step="any"
            value={typeof value === "number" ? value : ""}
            onChange={(event) => {
              const raw = event.target.value;
              setValues((current) => ({
                ...current,
                [field.name]: raw === "" ? "" : Number(raw)
              }));
            }}
          />
        </label>
      );
    }

    if (isTextAreaField(field)) {
      return (
        <label key={field.name} className="flex flex-col gap-2">
          <span>{field.label}</span>
          <textarea
            {...commonProps}
            rows={4}
            value={value === "" ? "" : String(value)}
            onChange={(event) =>
              setValues((current) => ({ ...current, [field.name]: event.target.value }))
            }
          />
        </label>
      );
    }

    return (
      <label key={field.name} className="flex flex-col gap-2">
        <span>{field.label}</span>
        <input
          {...commonProps}
          type="text"
          value={value === "" ? "" : String(value)}
          onChange={(event) =>
            setValues((current) => ({ ...current, [field.name]: event.target.value }))
          }
        />
      </label>
    );
  };

  return (
    <form className="flex flex-col gap-4 rounded-lg border p-4" onSubmit={handleSubmit}>
      {jobTypes.length > 1 ? (
        <label className="flex flex-col gap-2">
          <span>Тип генерации</span>
          <select
            className="rounded border p-2"
            value={selectedJobType}
            onChange={(event) => {
              const nextType = event.target.value;
              setSelectedJobType(nextType);
              const nextPreset = presets.find((preset) => preset.job_type === nextType);
              if (nextPreset) {
                setSelectedPresetId(nextPreset.id);
              }
            }}
          >
            {jobTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="flex flex-col gap-2">
        <span>Preset</span>
        <select
          className="rounded border p-2"
          value={selectedPresetId}
          onChange={(event) => setSelectedPresetId(event.target.value)}
        >
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-4">{requiredFields.map(renderField)}</div>

      {optionalFields.length > 0 ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="text-left text-sm text-blue-600"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            {showAdvanced ? "Скрыть расширенные настройки" : "Расширенные настройки"}
          </button>
          {showAdvanced ? (
            <div className="flex flex-col gap-4">{optionalFields.map(renderField)}</div>
          ) : null}
        </div>
      ) : null}

      <label className="flex flex-col gap-2">
        <span>Референс (скоро)</span>
        <input className="rounded border p-2" type="file" accept="image/*" />
      </label>

      <div>
        <button
          type="button"
          className="text-sm text-blue-600"
          onClick={() => setShowJson((prev) => !prev)}
        >
          {showJson ? "Скрыть JSON" : "JSON"}
        </button>
        {showJson ? (
          <pre className="mt-2 whitespace-pre-wrap rounded border bg-slate-50 p-2 text-xs">
            {JSON.stringify(currentParams, null, 2)}
          </pre>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Button type="submit">Сгенерировать</Button>
        {etaLabel ? <span className="text-xs text-slate-500">{etaLabel}</span> : null}
      </div>
    </form>
  );
}
