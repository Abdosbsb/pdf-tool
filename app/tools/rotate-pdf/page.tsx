"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import InputPreview from "@/components/file-preview/InputPreview";
import Button from "@/components/ui/Button";
import { formatFileSize } from "@/lib/file-utils";
import { rotateFile } from "@/lib/pdf/client-processor";

function RotatePdfContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [file, setFile] = useState<File | null>(null);
  const [degrees, setDegrees] = useState<90 | 180 | 270>(90);

  useEffect(() => {
    document.title = `${t("toolPages.rotatePdf")} - PDFCraft`;
  }, [t]);

  const handleFileSelected = useCallback((selected: File[]) => {
    if (selected.length === 0) return;
    setFile(selected[0]);
  }, []);

  const handleRotate = useCallback(async () => {
    if (!file) return;

    startProcessing();

    try {
      const blob = await rotateFile(file, degrees);
      const url = URL.createObjectURL(blob);
      complete(url, "rotated.pdf");
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    }
  }, [file, degrees, startProcessing, complete, fail, t]);

  const handleReset = useCallback(() => {
    setFile(null);
    setDegrees(90);
  }, []);

  const showUpload = !file && (state === "idle" || state === "failed");

  const rotationOptions: { value: 90 | 180 | 270; label: string; icon: React.ReactNode }[] = [
    {
      value: 90,
      label: "90\u00B0",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
        </svg>
      ),
    },
    {
      value: 180,
      label: "180\u00B0",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
      ),
    },
    {
      value: 270,
      label: "270\u00B0",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12c0-1.232.046-2.453.138-3.662a4.006 4.006 0 013.7-3.7 48.678 48.678 0 017.324 0 4.006 4.006 0 013.7 3.7c.017.22.032.441.046.662M4.5 12l-3-3m3 3l3-3m12 3c0 1.232-.046 2.453-.138 3.662a4.006 4.006 0 01-3.7 3.7 48.656 48.656 0 01-7.324 0 4.006 4.006 0 01-3.7-3.7c-.017-.22-.032-.441-.046-.662M19.5 12l-3 3m3-3l3 3" />
        </svg>
      ),
    },
  ];

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
                  {t("toolPages.rotationAngle")}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {rotationOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDegrees(option.value)}
                      className={`flex flex-col items-center gap-2 rounded-lg border-2 px-4 py-4 text-center transition-all ${
                        degrees === option.value
                          ? "border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-950 dark:text-brand-300"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600"
                      }`}
                    >
                      <span className={degrees === option.value ? "text-brand-600 dark:text-brand-400" : "text-gray-400 dark:text-gray-500"}>
                        {option.icon}
                      </span>
                      <span className="text-sm font-bold">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleRotate}
                className="w-full"
              >
                {t("toolPages.rotatePdf")}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function RotatePdfPage() {
  return (
    <ToolPage toolId="rotate-pdf">
      <RotatePdfContent />
    </ToolPage>
  );
}
