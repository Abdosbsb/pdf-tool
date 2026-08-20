"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { formatFileSize } from "@/lib/file-utils";
import type { ApiResponse } from "@/types";

function JpgToPdfContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    document.title = `${t("toolPages.convertToPdf")} - PDFCraft`;
  }, [t]);

  const handleFilesSelected = useCallback((selected: File[]) => {
    setFiles((prev) => [...prev, ...selected]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleConvert = useCallback(async () => {
    if (files.length === 0) return;

    startProcessing();
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      setUploadProgress(30);

      const res = await fetch("/api/tools/image-to-pdf", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(80);

      const json: ApiResponse<{ downloadUrl: string }> = await res.json();

      if (!json.success || !json.data) {
        throw new Error(json.error?.message || t("processing.failed"));
      }

      setUploadProgress(100);
      complete(json.data.downloadUrl, "converted.pdf");
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [files, startProcessing, complete, fail, t]);

  return (
    <div className="space-y-6">
      <FileUpload
        accept={["image/jpeg", "image/png", "image/jpg"]}
        multiple
        onFilesSelected={handleFilesSelected}
        disabled={uploading || state !== "idle"}
      />

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("toolPages.imageToPdfHint")}
      </p>

      {files.length > 0 && state === "idle" && (
        <>
          <ul className="space-y-2">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
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
                  onClick={() => removeFile(i)}
                  className="ml-3 shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          <Button
            variant="primary"
            size="lg"
            onClick={handleConvert}
            disabled={files.length === 0}
            className="w-full"
          >
            {t("toolPages.convertToPdf")}
          </Button>
        </>
      )}
    </div>
  );
}

export default function JpgToPdfPage() {
  return (
    <ToolPage toolId="jpg-to-pdf">
      <JpgToPdfContent />
    </ToolPage>
  );
}
