"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import Button from "@/components/ui/Button";
import { formatFileSize } from "@/lib/file-utils";

function DeletePagesContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [file, setFile] = useState<File | null>(null);
  const [pagesToDelete, setPagesToDelete] = useState("");

  useEffect(() => {
    document.title = `${t("toolPages.deletePages")} - PDFCraft`;
  }, [t]);

  const handleFileSelected = useCallback((selected: File[]) => {
    if (selected.length === 0) return;
    setFile(selected[0]);
    setPagesToDelete("");
  }, []);

  const parsePages = useCallback((input: string): number[] => {
    const pages: number[] = [];
    const parts = input.split(",").map((s) => s.trim());
    for (const part of parts) {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map(Number);
        for (let i = start; i <= end; i++) {
          if (!pages.includes(i)) pages.push(i);
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && !pages.includes(num)) pages.push(num);
      }
    }
    return pages.sort((a, b) => a - b);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!file || !pagesToDelete.trim()) return;

    startProcessing();

    try {
      const pages = parsePages(pagesToDelete);
      if (pages.length === 0) {
        throw new Error(t("toolPages.invalidPageRange"));
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("pagesToDelete", pages.join(","));

      const res = await fetch("/api/tools/split", { method: "POST", body: formData });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || t("processing.failed"));
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      complete(url, "deleted_pages.pdf");
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    }
  }, [file, pagesToDelete, startProcessing, complete, fail, t, parsePages]);

  const handleReset = useCallback(() => {
    setFile(null);
    setPagesToDelete("");
  }, []);

  return (
    <div className="space-y-6">
      {!file && (
        <FileUpload
          accept={["pdf"]}
          multiple={false}
          onFilesSelected={handleFileSelected}
          disabled={state !== "idle"}
        />
      )}

      {file && state === "idle" && (
        <>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="ml-3 shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("toolPages.pagesToDelete")}
            </p>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              {t("toolPages.pagesToDeleteHint")}
            </p>
            <input
              type="text"
              value={pagesToDelete}
              onChange={(e) => setPagesToDelete(e.target.value)}
              placeholder={t("toolPages.pagesToDeletePlaceholder")}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleDelete}
            disabled={!pagesToDelete.trim()}
            className="w-full"
          >
            {t("toolPages.deletePages")}
          </Button>
        </>
      )}
    </div>
  );
}

export default function DeletePagesPage() {
  return (
    <ToolPage toolId="delete-pages">
      <DeletePagesContent />
    </ToolPage>
  );
}
