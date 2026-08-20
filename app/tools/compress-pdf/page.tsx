"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import Button from "@/components/ui/Button";
import { formatFileSize } from "@/lib/file-utils";
import { compressFile } from "@/lib/pdf/client-processor";

type QualityLevel = "low" | "medium" | "high";

function CompressPdfContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<QualityLevel>("medium");
  const [resultData, setResultData] = useState<{ inputSize: number; outputSize: number } | null>(null);

  useEffect(() => {
    document.title = `${t("toolPages.compressPdf")} - PDFCraft`;
  }, [t]);

  const qualityMap: Record<QualityLevel, number> = {
    low: 0.3,
    medium: 0.6,
    high: 0.85,
  };

  const handleFileSelected = useCallback((selected: File[]) => {
    if (selected.length === 0) return;
    setFile(selected[0]);
    setResultData(null);
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file) return;

    startProcessing();

    try {
      const { blob, inputSize, outputSize } = await compressFile(file, qualityMap[quality]);
      const url = URL.createObjectURL(blob);
      setResultData({ inputSize, outputSize });
      complete(url, "compressed.pdf");
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    }
  }, [file, quality, qualityMap, startProcessing, complete, fail, t]);

  const handleReset = useCallback(() => {
    setFile(null);
    setQuality("medium");
    setResultData(null);
  }, []);

  const reductionPercent = resultData
    ? Math.round((1 - resultData.outputSize / resultData.inputSize) * 100)
    : 0;

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
              {t("toolPages.compressionQuality")}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {(["low", "medium", "high"] as QualityLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setQuality(level)}
                  className={`rounded-lg border-2 px-4 py-3 text-center text-sm font-medium transition-all ${
                    quality === level
                      ? "border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-950 dark:text-brand-300"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600"
                  }`}
                >
                  <span className="block text-base font-bold capitalize">
                    {t(`toolPages.quality${level.charAt(0).toUpperCase() + level.slice(1)}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleCompress}
            className="w-full"
          >
            {t("toolPages.compressPdf")}
          </Button>
        </>
      )}

      {resultData && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("toolPages.originalSize")}</p>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                {formatFileSize(resultData.inputSize)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("toolPages.compressedSize")}</p>
              <p className="mt-1 text-lg font-bold text-green-600 dark:text-green-400">
                {formatFileSize(resultData.outputSize)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("toolPages.reduction")}</p>
              <p className="mt-1 text-lg font-bold text-green-600 dark:text-green-400">
                {reductionPercent}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompressPdfPage() {
  return (
    <ToolPage toolId="compress-pdf">
      <CompressPdfContent />
    </ToolPage>
  );
}
