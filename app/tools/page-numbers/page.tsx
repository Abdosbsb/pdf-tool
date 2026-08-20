"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { formatFileSize } from "@/lib/file-utils";
import type { UploadedFile, ApiResponse } from "@/types";

type PageNumberPosition = "bottom-center" | "bottom-left" | "bottom-right";

function PageNumbersContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [position, setPosition] = useState<PageNumberPosition>("bottom-center");
  const [startPage, setStartPage] = useState(1);

  useEffect(() => {
    document.title = `${t("toolPages.pageNumbers")} - PDFCraft`;
  }, [t]);

  const handleFileSelected = useCallback(async (selected: File[]) => {
    if (selected.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selected[0]);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json: ApiResponse<UploadedFile> = await res.json();

      if (!json.success || !json.data) {
        throw new Error(json.error?.message || t("upload.error"));
      }

      setUploadedFile(json.data);
      setRawFile(selected[0]);
      setPosition("bottom-center");
      setStartPage(1);
    } catch (err) {
      fail(err instanceof Error ? err.message : t("upload.error"));
    } finally {
      setUploading(false);
    }
  }, [t, fail]);

  const handleApply = useCallback(async () => {
    if (!uploadedFile) return;

    startProcessing();

    try {
      const res = await fetch("/api/tools/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: uploadedFile.id,
          conversion: "pageNumbers",
          options: {
            position,
            startPageNumber: startPage,
          },
        }),
      });

      const json: ApiResponse<{ downloadUrl: string }> = await res.json();

      if (!json.success || !json.data) {
        throw new Error(json.error?.message || t("processing.failed"));
      }

      complete(json.data.downloadUrl, "numbered.pdf");
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    }
  }, [uploadedFile, position, startPage, startProcessing, complete, fail, t]);

  const handleReset = useCallback(() => {
    setUploadedFile(null);
    setRawFile(null);
    setPosition("bottom-center");
    setStartPage(1);
  }, []);

  const positionOptions: { value: PageNumberPosition; labelKey: string }[] = [
    { value: "bottom-center", labelKey: "toolPages.bottomCenter" },
    { value: "bottom-left", labelKey: "toolPages.bottomLeft" },
    { value: "bottom-right", labelKey: "toolPages.bottomRight" },
  ];

  return (
    <div className="space-y-6">
      {!uploadedFile && (
        <FileUpload
          accept={["pdf"]}
          multiple={false}
          onFilesSelected={handleFileSelected}
          disabled={uploading || state !== "idle"}
        />
      )}

      {uploading && (
        <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950">
          <Spinner size="sm" />
          <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
            {t("toolPages.uploading")}
          </p>
        </div>
      )}

      {uploadedFile && state === "idle" && (
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
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(uploadedFile.size)}
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

          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("toolPages.position")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {positionOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPosition(opt.value)}
                    className={`rounded-lg border-2 px-3 py-2 text-center text-sm font-medium transition-all ${
                      position === opt.value
                        ? "border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-950 dark:text-brand-300"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600"
                    }`}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("toolPages.startPageNumber")}
              </label>
              <input
                type="number"
                min={1}
                value={startPage}
                onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleApply}
            className="w-full"
          >
            {t("toolPages.addPageNumbers")}
          </Button>
        </>
      )}
    </div>
  );
}

export default function PageNumbersPage() {
  return (
    <ToolPage toolId="page-numbers">
      <PageNumbersContent />
    </ToolPage>
  );
}
