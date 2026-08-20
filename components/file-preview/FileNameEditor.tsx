"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { parseFileName, sanitizeFileName, ensureExtension } from "@/lib/file-utils";

interface FileNameEditorProps {
  fileName: string;
  onRename: (newName: string) => void;
}

export default function FileNameEditor({ fileName, onRename }: FileNameEditorProps) {
  const { t } = useLanguage();
  const { base, ext } = parseFileName(fileName);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(base);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(base);
  }, [base]);

  const commit = useCallback(() => {
    const sanitized = sanitizeFileName(value);
    if (!sanitized) {
      setError(t("filePreview.fileNameEmpty"));
      return;
    }
    const finalName = ensureExtension(sanitized, ext);
    setError(null);
    setEditing(false);
    onRename(finalName);
  }, [value, ext, onRename, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      }
      if (e.key === "Escape") {
        setValue(base);
        setError(null);
        setEditing(false);
      }
    },
    [commit, base]
  );

  const startEditing = useCallback(() => {
    setValue(base);
    setEditing(true);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [base]);

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {fileName}
        </span>
        <button
          type="button"
          onClick={startEditing}
          className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title={t("filePreview.rename")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        {ext && (
          <span className="shrink-0 rounded-md bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {ext}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
