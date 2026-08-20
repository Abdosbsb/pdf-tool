"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { formatFileSize, parseFileName, isPdfFile, isImageFile } from "@/lib/file-utils";

interface InputPreviewProps {
  file?: File | null;
  url?: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  pageCount?: number | null;
  label?: string;
  onRemove?: () => void;
}

export default function InputPreview({
  file,
  url,
  fileName,
  fileSize,
  mimeType,
  pageCount: pageCountProp,
  label,
  onRemove,
}: InputPreviewProps) {
  const { t } = useLanguage();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState(mimeType || "");
  const [detectedSize, setDetectedSize] = useState(fileSize ?? null);
  const [resolvedPageCount, setResolvedPageCount] = useState(pageCountProp ?? null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (url) {
      setPreviewUrl(url);
      return;
    }
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      urlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
      return;
    }
    setPreviewUrl(null);
  }, [file, url]);

  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mimeType) {
      setDetectedType(mimeType);
      return;
    }
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const mimeMap: Record<string, string> = {
        pdf: "application/pdf",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        txt: "text/plain",
      };
      setDetectedType(mimeMap[ext] || file.type || "");
    } else if (fileName) {
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
  }, [file, fileName, mimeType]);

  useEffect(() => {
    if (fileSize != null) {
      setDetectedSize(fileSize);
      return;
    }
    if (file) {
      setDetectedSize(file.size);
      return;
    }
  }, [file, fileSize]);

  useEffect(() => {
    if (pageCountProp != null) {
      setResolvedPageCount(pageCountProp);
      return;
    }
    if (resolvedPageCount != null) return;
    if (!detectedType || !isPdfFile(detectedType) || !previewUrl) return;

    let cancelled = false;
    import("pdf-lib").then(({ PDFDocument }) => {
      if (cancelled) return;
      fetch(previewUrl)
        .then((res) => res.arrayBuffer())
        .then((buf) => PDFDocument.load(buf))
        .then((doc) => {
          if (!cancelled) setResolvedPageCount(doc.getPageCount());
        })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [previewUrl, detectedType, pageCountProp, resolvedPageCount]);

  const displayLabel = label || t("filePreview.originalFile");

  const typeLabel = detectedType
    ? isPdfFile(detectedType)
      ? "PDF"
      : isImageFile(detectedType)
        ? detectedType.split("/")[1]?.toUpperCase() || "Image"
        : parseFileName(fileName).ext.replace(".", "").toUpperCase() || detectedType
    : parseFileName(fileName).ext.replace(".", "").toUpperCase() || t("filePreview.unknown");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {displayLabel}
        </h3>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
          {fileName}
        </p>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
          {typeLabel && (
            <span className="inline-flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              {typeLabel}
            </span>
          )}
          {detectedSize != null && (
            <span className="inline-flex items-center gap-1">
              {formatFileSize(detectedSize)}
            </span>
          )}
          {resolvedPageCount != null && resolvedPageCount > 0 && (
            <span className="inline-flex items-center gap-1">
              {resolvedPageCount === 1
                ? t("filePreview.pageCountSingular")
                : `${resolvedPageCount} ${t("filePreview.pageCount")}`}
            </span>
          )}
        </div>
      </div>

      {previewUrl && !previewFailed && (
        <div className="mb-3">
          {isPdfFile(detectedType) ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <iframe
                src={previewUrl}
                className="h-[300px] w-full sm:h-[400px]"
                title={`${fileName} preview`}
                onError={() => setPreviewFailed(true)}
              />
            </div>
          ) : isImageFile(detectedType) ? (
            <div className="flex justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
              <img
                src={previewUrl}
                alt={fileName}
                className="max-h-[300px] w-auto rounded object-contain sm:max-h-[400px]"
                onError={() => setPreviewFailed(true)}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
              <svg xmlns="http://www.w3.org/2000/svg" className="mb-2 h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("filePreview.previewUnavailable")}
              </p>
            </div>
          )}
        </div>
      )}

      {previewFailed && (
        <div className="mb-3 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("filePreview.previewUnavailable")}
          </p>
        </div>
      )}
    </div>
  );
}
