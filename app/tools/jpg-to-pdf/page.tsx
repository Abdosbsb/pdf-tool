"use client";

import { useState, useEffect, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import Button from "@/components/ui/Button";
import { formatFileSize } from "@/lib/file-utils";

function ImageToPdfContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail, reset } = useToolPage();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = `${t("toolPages.imageToPdf")} - PDFCraft`;
  }, [t]);

  // Create previews
  useEffect(() => {
    const newPreviews: Record<string, string> = {};
    files.forEach((file) => {
      const key = `${file.name}-${file.size}`;
      if (!previews[key]) {
        newPreviews[key] = URL.createObjectURL(file);
      }
    });
    if (Object.keys(newPreviews).length > 0) {
      setPreviews((prev) => ({ ...prev, ...newPreviews }));
    }
    // Cleanup old previews
    const currentKeys = files.map((f) => `${f.name}-${f.size}`);
    Object.keys(previews).forEach((key) => {
      if (!currentKeys.includes(key)) {
        URL.revokeObjectURL(previews[key]);
      }
    });
  }, [files]);

  const handleFilesSelected = useCallback((selected: File[]) => {
    setFiles((prev) => [...prev, ...selected]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveFile = useCallback((index: number, direction: -1 | 1) => {
    setFiles((prev) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  }, []);

  const handleConvert = useCallback(async () => {
    if (files.length === 0) return;
    startProcessing();

    try {
      const pdfDoc = await PDFDocument.create();

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        let image;
        try {
          image = await pdfDoc.embedJpg(arrayBuffer);
        } catch {
          try {
            image = await pdfDoc.embedPng(arrayBuffer);
          } catch {
            continue;
          }
        }

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      complete(url, "converted.pdf");
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    }
  }, [files, startProcessing, complete, fail, t]);

  return (
    <div className="space-y-6">
      <FileUpload
        accept={["image/jpeg", "image/png", "image/jpg"]}
        multiple
        onFilesSelected={handleFilesSelected}
        disabled={state !== "idle"}
      />

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("toolPages.imageToPdfHint")}
      </p>

      {files.length > 0 && state === "idle" && (
        <>
          <ul className="space-y-2">
            {files.map((file, i) => {
              const key = `${file.name}-${file.size}`;
              return (
                <li
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {previews[key] && (
                      <img
                        src={previews[key]}
                        alt={file.name}
                        className="h-10 w-10 shrink-0 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveFile(i, -1)}
                      disabled={i === 0}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveFile(i, 1)}
                      disabled={i === files.length - 1}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
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
      <ImageToPdfContent />
    </ToolPage>
  );
}
