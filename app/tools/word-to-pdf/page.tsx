"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import InputPreview from "@/components/file-preview/InputPreview";
import Button from "@/components/ui/Button";
import { runConversion } from "@/lib/advanced-conversion-client";

function WordToPdfContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    document.title = `${t("toolPages.convertWordToPdf")} - PDFCraft`;
  }, [t]);

  const handleFileSelected = useCallback((selected: File[]) => {
    if (selected.length === 0) return;
    setFile(selected[0]);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    startProcessing();

    try {
      const result = await runConversion(file, "wordToPdf", "converted.pdf");
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
          accept={["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]}
          typeErrorMessage={t("upload.invalidTypeWord")}
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
              {t("toolPages.convertWordToPdf")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export default function WordToPdfPage() {
  return (
    <ToolPage toolId="word-to-pdf">
      <WordToPdfContent />
    </ToolPage>
  );
}
