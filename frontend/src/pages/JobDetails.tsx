import { useEffect, useMemo, useState } from "react";
import {
  getJobDetail,
  getJobResult,
  type JobDetail,
  type JobResultPayload,
  type ResultItem
} from "../api/jobs";
import { Button } from "../components/ui/button";
import { formatJobType, formatStatus, ru } from "../i18n/ru";
import { NavHandler } from "./types";

const REQUEST_FIELD_LABELS: Record<string, string> = {
  prompt: "Промпт",
  text: "Текст",
  image_size: "Размер",
  quality: "Качество",
  temperature: "Температура",
  max_tokens: "Макс. токенов",
  translate_input: "Перевод ввода",
  mode: "Режим",
  duration: "Длительность",
  resolution: "Разрешение",
  aspect_ratio: "Соотношение",
  generate_audio: "Генерировать аудио",
  title: "Название",
  tags: "Теги",
  model: "Модель",
  audio_url: "Ссылка на аудио",
  image_url: "Ссылка на изображение",
  video_url: "Ссылка на видео",
  upscale_factor: "Коэффициент апскейла"
};

type TabKey = "readable" | "json";
type ResultTabKey = "result" | "json";

function pickText(items: ResultItem[]) {
  return items.find(
    (item): item is ResultItem & { text: string } => item.kind === "text" && !!item.text
  );
}

function pickFile(items: ResultItem[]) {
  return items.find(
    (item): item is ResultItem & { url: string } => item.kind === "file" && !!item.url
  );
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ru-RU");
}

function getReadableParams(params?: Record<string, unknown> | null) {
  if (!params) {
    return [];
  }
  const networkId = params.network_id as string | undefined;
  const nestedParams = params.params as Record<string, unknown> | undefined;
  const entries: Array<{ label: string; value: string }> = [];
  if (networkId) {
    entries.push({ label: ru.labels.model, value: networkId });
  }
  if (nestedParams) {
    Object.entries(nestedParams).forEach(([key, value]) => {
      const label = REQUEST_FIELD_LABELS[key] ?? key;
      const textValue =
        typeof value === "boolean" ? (value ? "Да" : "Нет") : String(value ?? "");
      entries.push({ label, value: textValue });
    });
  }
  return entries;
}

export function JobDetails({
  onNavigate,
  jobId: providedJobId
}: {
  onNavigate: NavHandler;
  jobId?: string | null;
}) {
  const [jobId, setJobId] = useState<string | null>(providedJobId ?? null);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [result, setResult] = useState<JobResultPayload | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [requestTab, setRequestTab] = useState<TabKey>("readable");
  const [resultTab, setResultTab] = useState<ResultTabKey>("result");
  const [hasRequestedResult, setHasRequestedResult] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!providedJobId) {
      const storedJobId = localStorage.getItem("last_job_id");
      setJobId(storedJobId);
      return;
    }
    setJobId(providedJobId);
  }, [providedJobId]);

  useEffect(() => {
    if (!jobId) {
      setJobError(ru.messages.jobNotFound);
      return;
    }
    let timer: number | undefined;
    let timeoutTimer: number | undefined;
    const startedAt = Date.now();

    const fetchJob = async () => {
      try {
        setIsPolling(true);
        const response = await getJobDetail(jobId);
        if (!response.ok) {
          if (response.statusCode === 404) {
            setJobError(ru.messages.jobNotFound);
            setIsPolling(false);
            if (timer) {
              window.clearInterval(timer);
            }
            if (timeoutTimer) {
              window.clearTimeout(timeoutTimer);
            }
            return;
          }
          throw new Error(response.error);
        }
        setJob(response.job);
        setJobError(null);
        if (response.job.result) {
          setResult(response.job.result);
        }
        if (response.job.status === "done" || response.job.status === "error") {
          setIsPolling(false);
          if (timer) {
            window.clearInterval(timer);
          }
          if (timeoutTimer) {
            window.clearTimeout(timeoutTimer);
          }
        }
        if (Date.now() - startedAt >= 180 * 1000) {
          setIsPolling(false);
          if (timer) {
            window.clearInterval(timer);
          }
        }
      } catch {
        setJobError(ru.errors.requestFailed);
        setIsPolling(false);
      }
    };

    fetchJob();
    timer = window.setInterval(fetchJob, 2000);
    timeoutTimer = window.setTimeout(() => {
      setIsPolling(false);
      if (timer) {
        window.clearInterval(timer);
      }
    }, 180 * 1000);

    return () => {
      if (timer) {
        window.clearInterval(timer);
      }
      if (timeoutTimer) {
        window.clearTimeout(timeoutTimer);
      }
    };
  }, [jobId]);

  useEffect(() => {
    if (!job || job.status !== "done" || job.result || result || hasRequestedResult) {
      return;
    }
    setHasRequestedResult(true);
    getJobResult(job.id)
      .then((response) => {
        if (response.result) {
          setResult(response.result as JobResultPayload);
        }
        if (response.error) {
          setResultError(ru.errors.generationFailed);
        }
      })
      .catch(() => setResultError(ru.errors.generationFailed));
  }, [job, result, hasRequestedResult]);

  const resolvedResult = result ?? job?.result ?? null;
  const textItem = useMemo(
    () => (resolvedResult ? pickText(resolvedResult.items) : undefined),
    [resolvedResult]
  );
  const fileItem = useMemo(
    () => (resolvedResult ? pickFile(resolvedResult.items) : undefined),
    [resolvedResult]
  );

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(ru.errors.copySuccess);
      setTimeout(() => setCopyStatus(null), 1500);
    } catch {
      setCopyStatus(ru.errors.copyFailed);
    }
  };

  const handleDownload = (url: string, filename?: string) => {
    const link = document.createElement("a");
    link.href = url;
    if (filename) {
      link.download = filename;
    }
    link.rel = "noreferrer";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const requestEntries = useMemo(() => getReadableParams(job?.params ?? null), [job?.params]);
  const requestJson = job?.params ? JSON.stringify(job.params, null, 2) : "";
  const resultJson = resolvedResult ? JSON.stringify(resolvedResult, null, 2) : "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{ru.titles.jobDetails}</h2>
        {job ? (
          <>
            <div className="text-sm text-gray-500">
              {ru.labels.id}: {job.id.slice(0, 8)} · {formatJobType(job.kind)}
            </div>
            <div className="text-sm text-gray-500">
              {ru.labels.status}: {formatStatus(job.status)} · {formatDateTime(job.created_at)}
            </div>
          </>
        ) : null}
      </div>

      {jobError ? <div className="rounded-lg border border-red-200 bg-red-50 p-3">{jobError}</div> : null}
      {job?.status === "error" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {job.error ?? ru.errors.generationFailed}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-base font-semibold">{ru.titles.request}</div>
            <Button
              type="button"
              onClick={() => handleCopy(requestJson)}
              disabled={!requestJson}
            >
              {ru.actions.copyJson}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded px-3 py-1 text-sm ${
                requestTab === "readable" ? "bg-black text-white" : "border"
              }`}
              type="button"
              onClick={() => setRequestTab("readable")}
            >
              {ru.actions.requestTab}
            </button>
            <button
              className={`rounded px-3 py-1 text-sm ${
                requestTab === "json" ? "bg-black text-white" : "border"
              }`}
              type="button"
              onClick={() => setRequestTab("json")}
            >
              {ru.actions.jsonRequestTab}
            </button>
          </div>
          {requestTab === "readable" ? (
            <div className="flex flex-col gap-2 text-sm">
              {requestEntries.length === 0 ? (
                <div className="text-gray-500">{ru.labels.parameters}</div>
              ) : (
                requestEntries.map((entry) => (
                  <div
                    key={entry.label}
                    className="flex flex-wrap items-start justify-between gap-2 border-b pb-2 text-sm last:border-none last:pb-0"
                  >
                    <span className="text-gray-500">{entry.label}</span>
                    <span className="text-right">{entry.value}</span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words rounded bg-slate-50 p-3 text-xs">
              {requestJson || "{}"}
            </pre>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-base font-semibold">{ru.titles.result}</div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => handleCopy(textItem?.text ?? fileItem?.url ?? "")}
                disabled={!textItem?.text && !fileItem?.url}
              >
                {ru.actions.copy}
              </Button>
              <Button
                type="button"
                onClick={() => fileItem?.url && handleDownload(fileItem.url, fileItem.filename)}
                disabled={!fileItem?.url}
              >
                {ru.actions.download}
              </Button>
              <Button type="button" onClick={() => setResultTab("json")}>
                {ru.actions.json}
              </Button>
            </div>
          </div>
          {copyStatus ? <div className="text-xs text-slate-500">{copyStatus}</div> : null}
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded px-3 py-1 text-sm ${
                resultTab === "result" ? "bg-black text-white" : "border"
              }`}
              type="button"
              onClick={() => setResultTab("result")}
            >
              {ru.actions.resultTab}
            </button>
            <button
              className={`rounded px-3 py-1 text-sm ${
                resultTab === "json" ? "bg-black text-white" : "border"
              }`}
              type="button"
              onClick={() => setResultTab("json")}
            >
              {ru.actions.jsonResultTab}
            </button>
          </div>
          {resultTab === "result" ? (
            <div className="flex flex-col gap-3">
              {isPolling ? (
                <div className="text-sm text-gray-500">{ru.messages.generating}</div>
              ) : null}
              {resultError ? <div className="text-sm text-red-500">{resultError}</div> : null}
              {textItem?.text ? (
                <textarea
                  className="min-h-[160px] w-full rounded border p-2 text-sm"
                  readOnly
                  value={textItem.text}
                />
              ) : null}
              {fileItem ? (
                <>
                  {resolvedResult?.type === "image" ? (
                    <img
                      className="max-h-80 w-full rounded border object-contain"
                      src={fileItem.url}
                      alt={fileItem.filename ?? ru.titles.result}
                    />
                  ) : null}
                  {resolvedResult?.type === "video" ? (
                    <video className="max-h-80 w-full rounded border" controls src={fileItem.url} />
                  ) : null}
                  {resolvedResult?.type === "audio" ? (
                    <audio className="w-full" controls src={fileItem.url} />
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <a
                      className="inline-flex items-center rounded bg-blue-600 px-3 py-2 text-sm text-white"
                      href={fileItem.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {ru.actions.open}
                    </a>
                    <Button type="button" onClick={() => handleDownload(fileItem.url, fileItem.filename)}>
                      {ru.actions.download}
                    </Button>
                    <Button type="button" onClick={() => handleCopy(fileItem.url)}>
                      {ru.actions.copyLink}
                    </Button>
                  </div>
                </>
              ) : null}
              {!textItem && !fileItem && !isPolling && !resultError ? (
                <div className="text-sm text-gray-500">{ru.messages.resultPending}</div>
              ) : null}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words rounded bg-slate-50 p-3 text-xs">
              {resultJson || "{}"}
            </pre>
          )}
        </div>
      </div>

      <button className="text-blue-600" onClick={() => onNavigate("history")}>
        {ru.actions.toHistory}
      </button>
    </div>
  );
}
