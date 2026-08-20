"use client";

import { Suspense, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import PdfEditor from "@/components/pdf-editor/PdfEditor";
import FileUpload from "@/components/upload/FileUpload";
import Spinner from "@/components/ui/Spinner";
import type { UploadedFile, ApiResponse } from "@/types";

function EditorContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const fileId = searchParams.get("fileId");

  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = useCallback(async (selected: File[]) => {
    if (selected.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", selected[0]);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json: ApiResponse<UploadedFile> = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error?.message || t("upload.error"));
      }
      setUploadedFile(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("upload.error"));
    } finally {
      setUploading(false);
    }
  }, [t]);

  if (fileId) {
    return <PdfEditor fileId={fileId} fileName="document.pdf" />;
  }

  if (uploadedFile) {
    return <PdfEditor fileId={uploadedFile.id} fileName={uploadedFile.name} />;
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-lg px-4">
        <div className="mb-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 h-12 w-12 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
          </svg>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            {t("toolPages.openEditor")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("upload.dragDrop")}
          </p>
        </div>

        {uploading && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950">
            <Spinner size="sm" />
            <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
              {t("toolPages.uploading")}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {!uploading && (
          <FileUpload
            accept={["pdf"]}
            multiple={false}
            onFilesSelected={handleFileSelected}
          />
        )}
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}
