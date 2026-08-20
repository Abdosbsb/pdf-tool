"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import Button from "@/components/ui/Button";
import { formatFileSize } from "@/lib/file-utils";
import { addPageNumbers } from "@/lib/pdf/client-processor";

type PageNumberPosition = "bottom-center" | "bottom-left" | "bottom-right";

function PageNumbersContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState<PageNumberPosition>("bottom-center");
  const [startPage, setStartPage] = useState(1);

  useEffect(() => {
    document.title = `${t("toolPages.pageNumbers")} - PDFCraft`;
  }, [t]);

  const handleFileSelected = useCallback((selected: File[]) => {
    if (selected.length === 0) return;
    setFile(selected[0]);
    setPosition("bottom-center");
    setStartPage(1);
  }, []);

  const handleApply = useCallback(async () => {
    if (!file) return;

    startProcessing();

    try {
      const blob = await addPageNumbers(file, startPage, position);
      const url = URL.createObjectURL(blob);
      complete(url, "numbered.pdf");
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    }
  }, [file, position, startPage, startProcessing, complete, fail, t]);

  const handleReset = useCallback(() => {
    setFile(null);
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
