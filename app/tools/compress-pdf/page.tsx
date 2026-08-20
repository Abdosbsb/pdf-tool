"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import InputPreview from "@/components/file-preview/InputPreview";
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

  const showUpload = !file && (state === "idle" || state === "failed");

  return (
    <div className="space-y-4">
      {showUpload && (
        <FileUpload
          accept={["pdf"]}
          typeErrorMessage={t("upload.invalidTypePdf")}
          multiple={false}
          onFilesSelected={handleFileSelected}
          disabled={state !== "idle"}
        />
      )}

      {file && (
        <>
          <InputPreview
            file={file}
            fileName={file.name}
            label={t("filePreview.originalFile")}
            onRemove={state === "idle" ? handleReset : undefined}
          />

          {state === "idle" && (
            <>
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
        </>
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
