"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import InputPreview from "@/components/file-preview/InputPreview";
import Button from "@/components/ui/Button";
import { runConversion } from "@/lib/advanced-conversion-client";

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
      const result = await runConversion(file, "excelToPdf", "converted.pdf");
      const url = URL.createObjectURL(result.blob);
      complete(url, result.filename);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("processing.failed");
      if (msg === "PROVIDER_REQUIRED") {
        fail(t("toolPages.providerRequired"));
      } else {
        fail(msg);
      }
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
          typeErrorMessage={t("upload.invalidTypeExcel")}
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
