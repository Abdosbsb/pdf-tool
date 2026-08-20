"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { formatFileSize, isValidFileType, MAX_FILE_SIZE } from "@/lib/file-utils";

interface FileUploadProps {
  accept?: string[];
  multiple?: boolean;
  maxSize?: number;
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

interface FileEntry {
  file: File;
  error?: "invalidType" | "tooLarge";
}

export default function FileUpload({
  accept,
  multiple = false,
  maxSize = MAX_FILE_SIZE,
  onFilesSelected,
  disabled = false,
}: FileUploadProps) {
  const { t } = useLanguage();
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndAdd = useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming);
      const validated: FileEntry[] = arr.map((file) => {
        if (accept && accept.length > 0 && !isValidFileType(file, accept)) {
          return { file, error: "invalidType" as const };
        }
        if (file.size > maxSize) {
          return { file, error: "tooLarge" as const };
        }
        return { file };
      });

      setFiles((prev) => {
        const next = multiple ? [...prev, ...validated] : validated;
        const validFiles = next.filter((e) => !e.error).map((e) => e.file);
        onFilesSelected(validFiles);
        return next;
      });
    },
    [accept, maxSize, multiple, onFilesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;
      if (e.dataTransfer.files.length > 0) {
        validateAndAdd(e.dataTransfer.files);
      }
    },
    [disabled, validateAndAdd]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        validateAndAdd(e.target.files);
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [validateAndAdd]
  );

  const removeFile = useCallback(
    (index: number) => {
      setFiles((prev) => {
        const next = prev.filter((_, i) => i !== index);
        onFilesSelected(next.filter((e) => !e.error).map((e) => e.file));
        return next;
      });
    },
    [onFilesSelected]
  );

  const inputAccept = useMemo(() => {
    if (!accept || accept.length === 0) return undefined;
    const mimeExtMap: Record<string, string> = {
      "application/pdf": ".pdf",
      "image/jpeg": ".jpg,.jpeg",
      "image/jpg": ".jpg,.jpeg",
      "image/png": ".png",
      "application/msword": ".doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
      "application/vnd.ms-excel": ".xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    };
    const extraExts: string[] = [];
    for (const a of accept) {
      if (mimeExtMap[a]) extraExts.push(mimeExtMap[a]);
    }
    const exts = extraExts.length > 0 ? "," + extraExts.join(",") : "";
    return accept.join(",") + exts;
  }, [accept]);

  const acceptedLabels = accept?.join(", ").toUpperCase() ?? "PDF";

  const imagePreviewUrls = useMemo(() => {
    const urls: Record<string, string> = {};
    for (const entry of files) {
      if (!entry.error && entry.file.type.startsWith("image/")) {
        urls[`${entry.file.name}-${entry.file.size}`] = URL.createObjectURL(entry.file);
      }
    }
    return urls;
  }, [files]);

  return (
    <div className="w-full space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200 ${
          disabled
            ? "cursor-not-allowed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
            : isDragOver
              ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950"
              : "cursor-pointer border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-brand-500"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={inputAccept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`mb-3 h-12 w-12 transition-colors ${
            isDragOver ? "text-brand-500" : "text-gray-400"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
          />
        </svg>

        <p className="mb-1 text-base font-medium text-gray-700 dark:text-gray-300">
          {t("upload.dragDrop")}
        </p>
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          {t("upload.or")}
        </p>
        <span className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700">
          {t("upload.browse")}
        </span>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t("upload.supported")} &middot; {t("upload.maxSize")}
        </p>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((entry, i) => (
            <li
              key={`${entry.file.name}-${i}`}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                entry.error
                  ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                  : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                {imagePreviewUrls[`${entry.file.name}-${entry.file.size}`] ? (
                  <img
                    src={imagePreviewUrls[`${entry.file.name}-${entry.file.size}`]}
                    alt={entry.file.name}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                    {entry.file.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatFileSize(entry.file.size)}</span>
                    <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 font-medium uppercase dark:bg-gray-700">
                      {entry.file.type.split("/").pop()?.split(".").pop() ?? "file"}
                    </span>
                  </div>
                  {entry.error && (
                    <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                      {entry.error === "invalidType"
                        ? t("upload.invalidType")
                        : t("upload.tooLarge")}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="ml-3 shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
                aria-label={t("upload.remove")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
