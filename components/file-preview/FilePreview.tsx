"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { isPdfFile, isImageFile } from "@/lib/file-utils";

interface FilePreviewProps {
  url: string;
  mimeType: string;
  fileName: string;
}

function PdfPreview({ url }: { url: string }) {
  const { t } = useLanguage();
  const [loadError, setLoadError] = useState(false);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("filePreview.previewUnavailable")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <iframe
        src={url}
        className="h-[400px] w-full sm:h-[500px]"
        title="PDF Preview"
        onError={() => setLoadError(true)}
      />
    </div>
  );
}

function ImagePreview({ url, fileName }: { url: string; fileName: string }) {
  const { t } = useLanguage();
  const [loadError, setLoadError] = useState(false);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("filePreview.previewUnavailable")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
      <img
        src={url}
        alt={fileName}
        className="max-h-[400px] w-auto rounded object-contain sm:max-h-[500px]"
        onError={() => setLoadError(true)}
      />
    </div>
  );
}

export default function FilePreview({ url, mimeType, fileName }: FilePreviewProps) {
  const { t } = useLanguage();
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    setPreviewFailed(false);
  }, [url]);

  if (previewFailed) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("filePreview.previewUnavailable")}
        </p>
      </div>
    );
  }

  try {
    if (isPdfFile(mimeType)) {
      return <PdfPreview url={url} />;
    }

    if (isImageFile(mimeType)) {
      return <ImagePreview url={url} fileName={fileName} />;
    }

    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
        <svg xmlns="http://www.w3.org/2000/svg" className="mb-3 h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("filePreview.previewUnavailable")}
        </p>
      </div>
    );
  } catch {
    setPreviewFailed(true);
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("filePreview.previewUnavailable")}
        </p>
      </div>
    );
  }
}
