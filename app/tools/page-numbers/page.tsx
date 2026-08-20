"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import Button from "@/components/ui/Button";
import InputPreview from "@/components/file-preview/InputPreview";
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
    <div className="space-y-4">
      {!file && (state === "idle" || state === "failed") && (
        <FileUpload
          accept={["pdf"]}
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
