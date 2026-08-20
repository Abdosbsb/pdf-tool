"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import InputPreview from "@/components/file-preview/InputPreview";
import Button from "@/components/ui/Button";
import { extractPages } from "@/lib/pdf/client-processor";

function ExtractPagesContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [file, setFile] = useState<File | null>(null);
  const [pagesToExtract, setPagesToExtract] = useState("");

  useEffect(() => {
    document.title = `${t("toolPages.extractPages")} - PDFCraft`;
  }, [t]);

  const handleFileSelected = useCallback((selected: File[]) => {
    if (selected.length === 0) return;
    setFile(selected[0]);
    setPagesToExtract("");
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

  const handleExtract = useCallback(async () => {
    if (!file || !pagesToExtract.trim()) return;

    startProcessing();

    try {
      const pages = parsePages(pagesToExtract);
      if (pages.length === 0) {
        throw new Error(t("toolPages.invalidPageRange"));
      }

      const blob = await extractPages(file, pages);
      const url = URL.createObjectURL(blob);
      complete(url, "extracted_pages.pdf");
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    }
  }, [file, pagesToExtract, startProcessing, complete, fail, t, parsePages]);

  const handleReset = useCallback(() => {
    setFile(null);
    setPagesToExtract("");
  }, []);

  return (
    <div className="space-y-4">
      {!file && (state === "idle" || state === "failed") && (
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
          <InputPreview file={file} fileName={file.name} label={t("filePreview.originalFile")} onRemove={state === "idle" ? handleReset : undefined} />

          {state === "idle" && (
            <>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("toolPages.pagesToExtract")}
                </p>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  {t("toolPages.pagesToExtractHint")}
                </p>
                <input
                  type="text"
                  value={pagesToExtract}
                  onChange={(e) => setPagesToExtract(e.target.value)}
                  placeholder={t("toolPages.pagesToExtractPlaceholder")}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleExtract}
                disabled={!pagesToExtract.trim()}
                className="w-full"
              >
                {t("toolPages.extractPages")}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function ExtractPagesPage() {
  return (
    <ToolPage toolId="extract-pages">
      <ExtractPagesContent />
    </ToolPage>
  );
}
