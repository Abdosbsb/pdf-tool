"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import Button from "@/components/ui/Button";
import { formatFileSize } from "@/lib/file-utils";

function CropPdfContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [file, setFile] = useState<File | null>(null);
  const [marginTop, setMarginTop] = useState(0);
  const [marginBottom, setMarginBottom] = useState(0);
  const [marginLeft, setMarginLeft] = useState(0);
  const [marginRight, setMarginRight] = useState(0);

  useEffect(() => {
    document.title = `${t("toolPages.cropPdf")} - PDFCraft`;
  }, [t]);

  const handleFileSelected = useCallback((selected: File[]) => {
    if (selected.length === 0) return;
    setFile(selected[0]);
    setMarginTop(0);
    setMarginBottom(0);
    setMarginLeft(0);
    setMarginRight(0);
  }, []);

  const handleCrop = useCallback(async () => {
    if (!file) return;

    startProcessing();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversion", "crop");
      formData.append("margins", JSON.stringify({ top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight }));

      const res = await fetch("/api/tools/advanced", { method: "POST", body: formData });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        if (err?.error?.code === "PROVIDER_REQUIRED") {
          fail(t("toolPages.providerRequired"));
          return;
        }
        throw new Error(err?.error?.message || t("processing.failed"));
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      complete(url, "cropped.pdf");
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    }
  }, [file, marginTop, marginBottom, marginLeft, marginRight, startProcessing, complete, fail, t]);

  const handleReset = useCallback(() => {
    setFile(null);
    setMarginTop(0);
    setMarginBottom(0);
    setMarginLeft(0);
    setMarginRight(0);
  }, []);

  const hasCrops = marginTop > 0 || marginBottom > 0 || marginLeft > 0 || marginRight > 0;

  const marginInputs = [
    { label: "toolPages.marginTop", value: marginTop, setter: setMarginTop },
    { label: "toolPages.marginBottom", value: marginBottom, setter: setMarginBottom },
    { label: "toolPages.marginLeft", value: marginLeft, setter: setMarginLeft },
    { label: "toolPages.marginRight", value: marginRight, setter: setMarginRight },
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

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("toolPages.cropMargins")}
            </p>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              {t("toolPages.cropMarginsHint")}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {marginInputs.map((m) => (
                <div key={m.label}>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t(m.label)}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={m.value}
                    onChange={(e) => m.setter(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleCrop}
            disabled={!hasCrops}
            className="w-full"
          >
            {t("toolPages.applyCrop")}
          </Button>
        </>
      )}
    </div>
  );
}

export default function CropPdfPage() {
  return (
    <ToolPage toolId="crop-pdf">
      <CropPdfContent />
    </ToolPage>
  );
}
