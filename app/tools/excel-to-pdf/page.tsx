"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import InputPreview from "@/components/file-preview/InputPreview";
import Button from "@/components/ui/Button";

function ExcelToPdfContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    document.title = `${t("toolPages.convertExcelToPdf")} - PDFCraft`;
  }, [t]);

  const handleFileSelected = useCallback((selected: File[]) => {
    if (selected.length === 0) return;
    setFile(selected[0]);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    startProcessing();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversion", "excelToPdf");

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
      complete(url, "converted.pdf");
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
          accept={[
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/csv",
          ]}
          multiple={false}
          onFilesSelected={handleFileSelected}
          disabled={state !== "idle"}
        />
      )}

      {file && (
        <>
          <InputPreview file={file} fileName={file.name} label={t("filePreview.originalFile")} onRemove={state === "idle" ? handleReset : undefined} />

          {state === "idle" && (
            <Button
              variant="primary"
              size="lg"
              onClick={handleConvert}
              className="w-full"
            >
              {t("toolPages.convertExcelToPdf")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export default function ExcelToPdfPage() {
  return (
    <ToolPage toolId="excel-to-pdf">
      <ExcelToPdfContent />
    </ToolPage>
  );
}
