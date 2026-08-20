"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import InputPreview from "@/components/file-preview/InputPreview";
import Button from "@/components/ui/Button";
import { formatFileSize } from "@/lib/file-utils";
import { splitFile } from "@/lib/pdf/client-processor";

function SplitPdfContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [file, setFile] = useState<File | null>(null);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);

  useEffect(() => {
    document.title = `${t("toolPages.splitPdf")} - PDFCraft`;
  }, [t]);

  const handleFileSelected = useCallback((selected: File[]) => {
    if (selected.length === 0) return;
    setFile(selected[0]);
    setStartPage(1);
    setEndPage(1);
  }, []);

  const handleSplit = useCallback(async () => {
    if (!file) return;
    if (startPage < 1 || endPage < startPage) return;

    startProcessing();

    try {
      const blob = await splitFile(file, startPage, endPage);
      const url = URL.createObjectURL(blob);
      complete(url, `split_${startPage}-${endPage}.pdf`);
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    }
  }, [file, startPage, endPage, startProcessing, complete, fail, t]);

  const handleReset = useCallback(() => {
    setFile(null);
    setStartPage(1);
    setEndPage(1);
  }, []);

  const showUpload = !file && (state === "idle" || state === "failed");

  return (
    <div className="space-y-4">
      {showUpload && (
        <FileUpload
          accept={["pdf"]}
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
                  {t("toolPages.splitOptions")}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      {t("toolPages.startPage")}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={startPage}
                      onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      {t("toolPages.endPage")}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={endPage}
                      onChange={(e) => setEndPage(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleSplit}
                disabled={startPage < 1 || endPage < startPage}
                className="w-full"
              >
                {t("toolPages.splitPdf")}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function SplitPdfPage() {
  return (
    <ToolPage toolId="split-pdf">
      <SplitPdfContent />
    </ToolPage>
  );
}
