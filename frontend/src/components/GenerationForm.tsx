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

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId),
    [presets, selectedPresetId]
  );

  useEffect(() => {
    if (presets.length > 0 && !selectedPresetId) {
      setSelectedPresetId(presets[0].id);
    }
  }, [presets, selectedPresetId]);

  useEffect(() => {
    if (selectedPreset) {
      setValues(buildInitialValues(selectedPreset.fields));
    }
  }, [selectedPreset]);

  if (!selectedPreset) {
    return null;
  }

  const requiredFields = selectedPreset.fields.filter((field) => field.required);
  const optionalFields = selectedPreset.fields.filter((field) => !field.required);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params: GenerationParams = {};

    selectedPreset.fields.forEach((field) => {
      const value = values[field.name];
      if (value === "" || value === undefined) {
        return;
      }
      params[field.name] = value as string | number | boolean;
    });

    onSubmit(selectedPreset, params);
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

      <Button type="submit">Сгенерировать</Button>
    </form>
  );
}
