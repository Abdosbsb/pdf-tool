"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import InputPreview from "@/components/file-preview/InputPreview";
import Button from "@/components/ui/Button";
import { formatFileSize } from "@/lib/file-utils";
import { removeMetadata } from "@/lib/pdf/client-processor";

function RemoveMetadataContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    document.title = `${t("toolPages.removeMetadata")} - PDFCraft`;
  }, [t]);

  const handleFileSelected = useCallback((selected: File[]) => {
    if (selected.length === 0) return;
    setFile(selected[0]);
  }, []);

  const handleRemove = useCallback(async () => {
    if (!file) return;

    startProcessing();

    try {
      const blob = await removeMetadata(file);
      const url = URL.createObjectURL(blob);
      complete(url, "cleaned.pdf");
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    }
  }, [file, startProcessing, complete, fail, t]);

  const handleReset = useCallback(() => {
    setFile(null);
  }, []);

  return (
    <div className="space-y-4">
      {!file && (state === "idle" || state === "failed") && (
        <FileUpload
          accept={["pdf"]}
          typeErrorMessage={t("upload.invalidTypePdf")}
          multiple={false}
          onFilesSelected={handleFileSelected}
          disabled={state !== "idle"}
        />
      )}

      {file && (
        <InputPreview file={file} fileName={file.name} label={t("filePreview.originalFile")} onRemove={state === "idle" ? handleReset : undefined} />
      )}

      {file && state === "idle" && (
        <>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("toolPages.removeMetadataDescription")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("toolPages.removeMetadataHint")}
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleRemove}
            className="w-full"
          >
            {t("toolPages.removeMetadata")}
          </Button>
        </>
      )}
    </div>
  );
}

export default function RemoveMetadataPage() {
  return (
    <ToolPage toolId="remove-metadata">
      <RemoveMetadataContent />
    </ToolPage>
  );
}
