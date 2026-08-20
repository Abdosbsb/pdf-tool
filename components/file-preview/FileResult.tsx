"use client";

import { useState, useCallback, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { formatFileSize, parseFileName, isPdfFile, isImageFile } from "@/lib/file-utils";
import FilePreview from "./FilePreview";
import FileNameEditor from "./FileNameEditor";

interface FileResultProps {
  url: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  pageCount?: number | null;
  onProcessAnother?: () => void;
}

export default function FileResult({
  url,
  fileName,
  fileSize,
  mimeType,
  pageCount,
  onProcessAnother,
}: FileResultProps) {
  const { t } = useLanguage();
  const [currentName, setCurrentName] = useState(fileName);
  const [detectedType, setDetectedType] = useState(mimeType || "");
  const [detectedSize, setDetectedSize] = useState(fileSize ?? null);
  const [resolvedPageCount, setResolvedPageCount] = useState(pageCount ?? null);

  useEffect(() => {
    setCurrentName(fileName);
  }, [fileName]);

  useEffect(() => {
    if (mimeType) {
      setDetectedType(mimeType);
      return;
    }
    if (fileName) {
      const { ext } = parseFileName(fileName);
      const mimeMap: Record<string, string> = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".txt": "text/plain",
      };
      setDetectedType(mimeMap[ext.toLowerCase()] || "");
    }
  }, [fileName, mimeType]);

  useEffect(() => {
    if (fileSize != null) {
      setDetectedSize(fileSize);
      return;
    }
    fetch(url, { method: "HEAD" })
      .then((res) => {
        const contentLength = res.headers.get("Content-Length");
        if (contentLength) setDetectedSize(parseInt(contentLength, 10));
      })
      .catch(() => {});
  }, [url, fileSize]);

  useEffect(() => {
    if (pageCount != null || resolvedPageCount != null) return;
    if (!detectedType || !isPdfFile(detectedType)) return;

    let cancelled = false;
    import("pdf-lib").then(({ PDFDocument }) => {
      if (cancelled) return;
      fetch(url)
        .then((res) => res.arrayBuffer())
        .then((buf) => PDFDocument.load(buf))
        .then((doc) => {
          if (!cancelled) setResolvedPageCount(doc.getPageCount());
        })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [url, detectedType, pageCount, resolvedPageCount]);

  const handleRename = useCallback((newName: string) => {
    setCurrentName(newName);
  }, []);

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = url;
    a.download = currentName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [url, currentName]);

  const typeLabel = detectedType
    ? isPdfFile(detectedType)
      ? "PDF"
      : isImageFile(detectedType)
        ? detectedType.split("/")[1]?.toUpperCase() || "Image"
        : parseFileName(currentName).ext.replace(".", "").toUpperCase() || detectedType
    : parseFileName(currentName).ext.replace(".", "").toUpperCase() || t("filePreview.unknown");

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div className="text-center sm:text-left">
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            {t("processing.completed")}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-3">
          <FileNameEditor fileName={currentName} onRename={handleRename} />
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
          {typeLabel && (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 font-medium dark:bg-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              {typeLabel}
            </span>
          )}
          {detectedSize != null && (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 font-medium dark:bg-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
              {formatFileSize(detectedSize)}
            </span>
          )}
          {resolvedPageCount != null && resolvedPageCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 font-medium dark:bg-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              {resolvedPageCount === 1
                ? t("filePreview.pageCountSingular")
                : `${resolvedPageCount} ${t("filePreview.pageCount")}`}
            </span>
          )}
        </div>
      </div>

      {detectedType && (
        <FilePreview url={url} mimeType={detectedType} fileName={currentName} />
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {t("processing.download")}
        </button>
        {onProcessAnother && (
          <button
            type="button"
            onClick={onProcessAnother}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t("processing.processAnother")}
          </button>
        )}
      </div>
    </div>
  );
}
