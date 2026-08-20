"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { formatFileSize } from "@/lib/file-utils";
import type { UploadedFile, ApiResponse } from "@/types";

interface UploadedEntry {
  file: File;
  uploaded: UploadedFile;
}

function MergePdfContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [files, setFiles] = useState<UploadedEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    document.title = `${t("toolPages.mergePdf")} - PDFCraft`;
  }, [t]);

  const handleFilesSelected = useCallback(async (selected: File[]) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const newEntries: UploadedEntry[] = [];
      for (let i = 0; i < selected.length; i++) {
        const formData = new FormData();
        formData.append("file", selected[i]);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const json: ApiResponse<UploadedFile> = await res.json();

        if (!json.success || !json.data) {
          throw new Error(json.error?.message || t("upload.error"));
        }

        newEntries.push({ file: selected[i], uploaded: json.data });
        setUploadProgress(Math.round(((i + 1) / selected.length) * 100));
      }

      setFiles((prev) => [...prev, ...newEntries]);
    } catch (err) {
      fail(err instanceof Error ? err.message : t("upload.error"));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [t, fail]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveFile = useCallback((index: number, direction: -1 | 1) => {
    setFiles((prev) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  }, []);

  const handleMerge = useCallback(async () => {
    if (files.length < 2) return;

    startProcessing();

    try {
      const res = await fetch("/api/tools/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: files.map((e) => e.uploaded.id) }),
      });

      const json: ApiResponse<{ downloadUrl: string }> = await res.json();

      if (!json.success || !json.data) {
        throw new Error(json.error?.message || t("processing.failed"));
      }

      complete(json.data.downloadUrl, "merged.pdf");
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    }
  }, [files, startProcessing, complete, fail, t]);

  return (
    <div className="space-y-6">
      <FileUpload
        accept={["pdf"]}
        multiple
        onFilesSelected={handleFilesSelected}
        disabled={uploading || state !== "idle"}
      />

      {uploading && (
        <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950">
          <Spinner size="sm" />
          <div className="flex-1">
            <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
              {t("toolPages.uploading")}
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-200 dark:bg-brand-800">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
            {uploadProgress}%
          </span>
        </div>
      )}

      {files.length > 0 && state === "idle" && (
        <>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {files.length} {files.length === 1 ? t("toolPages.fileReady") : t("toolPages.filesReady")}
            </p>
          </div>

          <ul className="space-y-2">
            {files.map((entry, i) => (
              <li
                key={entry.uploaded.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-brand-100 text-sm font-bold text-brand-600 dark:bg-brand-900 dark:text-brand-400">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                      {entry.file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(entry.file.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveFile(i, -1)}
                    disabled={i === 0}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    title={t("toolPages.moveUp")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveFile(i, 1)}
                    disabled={i === files.length - 1}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    title={t("toolPages.moveDown")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
                    title={t("toolPages.removeFile")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {files.length < 2 && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {t("toolPages.minimum2Files")}
            </p>
          )}

          <Button
            variant="primary"
            size="lg"
            onClick={handleMerge}
            disabled={files.length < 2}
            className="w-full"
          >
            {t("toolPages.mergePdf")}
          </Button>
        </>
      )}
    </div>
  );
}

export default function MergePdfPage() {
  return (
    <ToolPage toolId="merge-pdf">
      <MergePdfContent />
    </ToolPage>
  );
}
