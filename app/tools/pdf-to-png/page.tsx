"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import InputPreview from "@/components/file-preview/InputPreview";
import Button from "@/components/ui/Button";
import JSZip from "jszip";

function PdfToPngContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    document.title = `${t("toolPages.convertToPng")} - PDFCraft`;
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
      formData.append("conversion", "pdfToPng");

      const res = await fetch("/api/tools/advanced", { method: "POST", body: formData });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        if (err?.error?.code === "PROVIDER_REQUIRED") {
          fail(t("toolPages.providerRequired"));
          return;
        }
        throw new Error(err?.error?.message || t("processing.failed"));
      }

      const contentType = res.headers.get("Content-Type") || "";
      const blob = await res.blob();

      if (contentType.includes("application/zip")) {
        const zip = await JSZip.loadAsync(blob);
        const entries = Object.values(zip.files).filter((f) => !f.dir);
        if (entries.length === 0) {
          throw new Error(t("processing.failed"));
        }
        const firstEntry = entries[0];
        const fileBlob = await firstEntry.async("blob");
        const url = URL.createObjectURL(fileBlob);
        complete(url, firstEntry.name);
      } else {
        const url = URL.createObjectURL(blob);
        complete(url, "converted.png");
      }
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
              {t("toolPages.convertToPng")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export default function PdfToPngPage() {
  return (
    <ToolPage toolId="pdf-to-png">
      <PdfToPngContent />
    </ToolPage>
  );
}
