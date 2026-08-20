"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import InputPreview from "@/components/file-preview/InputPreview";
import Button from "@/components/ui/Button";

function PdfToTextContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    document.title = `${t("toolPages.convertToText")} - PDFCraft`;
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
      formData.append("conversion", "pdfToText");

      const res = await fetch("/api/tools/advanced", { method: "POST", body: formData });

      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        let errCode: string | undefined;
        let errMsg: string | undefined;
        if (contentType.includes("application/json")) {
          const err = await res.json();
          errCode = err?.error?.code;
          errMsg = err?.error?.message;
        } else {
          errMsg = await res.text().catch(() => "");
        }
        if (errCode === "PROVIDER_REQUIRED") {
          fail(t("toolPages.providerRequired"));
          return;
        }
        throw new Error(errMsg || t("processing.failed"));
      }

      if (!contentType.includes("application/pdf") && !contentType.includes("image/") && !contentType.includes("text/plain") && !contentType.includes("application/zip") && !contentType.includes("application/vnd")) {
        const text = await res.text().catch(() => "");
        if (text.startsWith("{")) {
          try {
            const json = JSON.parse(text);
            if (json?.error?.code === "PROVIDER_REQUIRED") {
              fail(t("toolPages.providerRequired"));
              return;
            }
            throw new Error(json?.error?.message || t("processing.failed"));
          } catch (e) {
            if (e instanceof SyntaxError) throw new Error(t("processing.failed"));
            throw e;
          }
        }
        throw new Error(t("processing.failed"));
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      complete(url, "converted.txt");
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
        <>
          <InputPreview file={file} fileName={file.name} label={t("filePreview.originalFile")} onRemove={state === "idle" ? handleReset : undefined} />

          {state === "idle" && (
            <Button
              variant="primary"
              size="lg"
              onClick={handleConvert}
              className="w-full"
            >
              {t("toolPages.convertToText")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export default function PdfToTextPage() {
  return (
    <ToolPage toolId="pdf-to-text">
      <PdfToTextContent />
    </ToolPage>
  );
}
