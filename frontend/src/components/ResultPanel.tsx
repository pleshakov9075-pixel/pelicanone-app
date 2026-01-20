import { useMemo, useState } from "react";
import type { JobResultPayload, ResultItem } from "../api/jobs";
import { Button } from "./ui/button";
import { formatStatus, ru } from "../i18n/ru";

type ResultPanelProps = {
  status?: string | null;
  result?: JobResultPayload | null;
  error?: string | null;
  debug?: unknown;
  isLoading?: boolean;
};

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

export function ResultPanel({ status, result, error, debug, isLoading }: ResultPanelProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const textItem = useMemo(() => (result ? pickText(result.items) : undefined), [result]);
  const fileItem = useMemo(() => (result ? pickFile(result.items) : undefined), [result]);
  const fileUrl = fileItem?.url;
  const isExternalLink = useMemo(() => {
    if (!fileUrl) {
      return false;
    }
    if (fileUrl.startsWith("/media/")) {
      return false;
    }
    try {
      const parsed = new URL(fileUrl, window.location.origin);
      return parsed.origin !== window.location.origin;
    } catch {
      return false;
    }
  }, [fileUrl]);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(ru.errors.copySuccess);
      setTimeout(() => setCopyStatus(null), 1500);
    } catch {
      setCopyStatus(ru.errors.copyFailed);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">{ru.titles.result}</div>
        {status ? (
          <div className="text-xs text-slate-500">
            {ru.labels.status}: {formatStatus(status)}
          </div>
        ) : null}
      </div>

      {isLoading ? <div className="text-sm text-slate-500">{ru.messages.generating}</div> : null}
      {error ? <div className="text-sm text-red-500">{error}</div> : null}

      {textItem?.text ? (
        <div className="flex flex-col gap-2">
          <textarea
            className="min-h-[140px] w-full rounded border p-2 text-sm"
            rows={6}
            readOnly
            value={textItem.text}
          />
          <div className="flex flex-wrap gap-2 text-sm">
            <Button type="button" onClick={() => handleCopy(textItem.text)}>
              {ru.actions.copy}
            </Button>
            {copyStatus ? <span className="text-xs text-slate-500">{copyStatus}</span> : null}
          </div>
        </div>
      ) : null}

      {fileItem ? (
        <div className="flex flex-col gap-3">
          {result?.type === "image" ? (
            <img
              className="max-h-80 w-full rounded border object-contain"
              src={fileItem.url}
              alt={fileItem.filename ?? ru.titles.result}
            />
          ) : null}
          {result?.type === "video" ? (
            <video className="max-h-80 w-full rounded border" controls src={fileItem.url} />
          ) : null}
          {result?.type === "audio" ? (
            <audio className="w-full" controls src={fileItem.url} />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex items-center rounded bg-blue-600 px-3 py-1 text-sm text-white"
              href={fileItem.url}
              target="_blank"
              rel="noreferrer"
            >
              {ru.actions.open}
            </a>
            <a
              className="inline-flex items-center rounded border px-3 py-1 text-sm"
              href={fileItem.url}
              download={fileItem.filename ?? ru.titles.result}
            >
              {ru.actions.download}
            </a>
            <Button type="button" onClick={() => handleCopy(fileItem.url)}>
              {ru.actions.copyLink}
            </Button>
            {copyStatus ? <span className="text-xs text-slate-500">{copyStatus}</span> : null}
            {isExternalLink ? (
              <span className="text-xs text-amber-600">{ru.labels.externalLink}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {!textItem && !fileItem && !isLoading && !error ? (
        <div className="text-sm text-slate-500">{ru.messages.resultPending}</div>
      ) : null}

      {debug ? (
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer">{ru.actions.rawDebug}</summary>
          <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(debug, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}
