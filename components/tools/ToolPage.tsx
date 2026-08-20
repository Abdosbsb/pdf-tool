"use client";

import { useState, useCallback, createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { getToolById } from "@/lib/tools";
import Spinner from "@/components/ui/Spinner";

type ProcessState = "idle" | "uploading" | "processing" | "completed" | "failed";

interface ToolPageContextValue {
  state: ProcessState;
  startProcessing: () => void;
  complete: (downloadUrl: string, fileName: string) => void;
  fail: (error: string) => void;
  reset: () => void;
  downloadUrl: string | null;
  downloadName: string;
}

const ToolPageContext = createContext<ToolPageContextValue | null>(null);

export function useToolPage() {
  const ctx = useContext(ToolPageContext);
  if (!ctx) throw new Error("useToolPage must be used within a ToolPage");
  return ctx;
}

export default function ToolPage({
  toolId,
  children,
}: {
  toolId: string;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const tool = getToolById(toolId);
  const [state, setState] = useState<ProcessState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("result");

  const startProcessing = useCallback(() => {
    setState("processing");
    setError(null);
  }, []);

  const complete = useCallback((url: string, fileName: string) => {
    setDownloadUrl(url);
    setDownloadName(fileName);
    setState("completed");
  }, []);

  const fail = useCallback((err: string) => {
    setError(err);
    setState("failed");
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setDownloadUrl(null);
  }, []);

  if (!tool) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("common.error")}
        </h1>
        <Link
          href="/tools"
          className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          {t("common.back")}
        </Link>
      </div>
    );
  }

  const ctx: ToolPageContextValue = {
    state,
    startProcessing,
    complete,
    fail,
    reset,
    downloadUrl,
    downloadName,
  };

  return (
    <ToolPageContext.Provider value={ctx}>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/tools"
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {t("common.back")}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            {t(tool.nameKey)}
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t(tool.descriptionKey)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-8">
          {state === "idle" && <>{children}</>}

          {state === "processing" && (
            <div className="flex flex-col items-center justify-center py-16">
              <Spinner size="lg" />
              <p className="mt-6 text-lg font-medium text-gray-700 dark:text-gray-300">
                {t("processing.processing")}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t(tool.nameKey)}
              </p>
            </div>
          )}

          {state === "completed" && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {t("processing.completed")}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={downloadName}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    {t("processing.download")}
                  </a>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {t("processing.processAnother")}
                </button>
              </div>
            </div>
          )}

          {state === "failed" && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {t("processing.failed")}
              </p>
              {error && (
                <p className="mt-2 max-w-md text-center text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                >
                  {t("common.retry")}
                </button>
                <Link
                  href="/tools"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {t("common.back")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageContext.Provider>
  );
}
