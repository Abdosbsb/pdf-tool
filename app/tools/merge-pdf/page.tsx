"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import InputPreview from "@/components/file-preview/InputPreview";
import Button from "@/components/ui/Button";
import { formatFileSize } from "@/lib/file-utils";
import { mergeFiles } from "@/lib/pdf/client-processor";

function MergePdfContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    document.title = `${t("toolPages.mergePdf")} - PDFCraft`;
  }, [t]);

  const handleFilesSelected = useCallback((selected: File[]) => {
    setFiles((prev) => [...prev, ...selected]);
  }, []);

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
      const blob = await mergeFiles(files);
      const url = URL.createObjectURL(blob);
      complete(url, "merged.pdf");
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    }
  }, [files, startProcessing, complete, fail, t]);

  const showUpload = state === "idle" || state === "failed";

  return (
    <div className="space-y-4">
      {showUpload && (
        <FileUpload
          accept={["pdf"]}
          typeErrorMessage={t("upload.invalidTypePdf")}
          multiple
          onFilesSelected={handleFilesSelected}
          disabled={state !== "idle"}
        />
      )}

      {files.length > 0 && (
        <>
          <ul className="space-y-2">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-brand-100 text-sm font-bold text-brand-600 dark:bg-brand-900 dark:text-brand-400">
                    {i + 1}
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
                {state === "idle" && (
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
                )}
              </li>
            ))}
          </ul>

          {files.length < 2 && state === "idle" && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {t("toolPages.minimum2Files")}
            </p>
          )}

          {state === "idle" && (
            <Button
              variant="primary"
              size="lg"
              onClick={handleMerge}
              disabled={files.length < 2}
              className="w-full"
            >
              {t("toolPages.mergePdf")}
            </Button>
          )}
        </>
      )}

      {files.length > 0 && state === "idle" && (
        <div className="pt-2">
          <InputPreview
            file={files[0]}
            fileName={files[0].name}
            fileSize={files.reduce((sum, f) => sum + f.size, 0)}
            label={t("filePreview.originalFile")}
          />
          {files.length > 1 && (
            <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
              {files.length} {t("filePreview.pageCount")}
            </p>
          )}
        </div>
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
