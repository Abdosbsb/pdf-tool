"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import Button from "@/components/ui/Button";
import InputPreview from "@/components/file-preview/InputPreview";
import { addWatermark } from "@/lib/pdf/client-processor";

type WatermarkPosition = "center" | "top" | "bottom";

function WatermarkContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [file, setFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState("");
  const [position, setPosition] = useState<WatermarkPosition>("center");
  const [opacity, setOpacity] = useState(50);
  const [fontSize, setFontSize] = useState(48);

  useEffect(() => {
    document.title = `${t("toolPages.watermark")} - PDFCraft`;
  }, [t]);

  const handleFileSelected = useCallback((selected: File[]) => {
    if (selected.length === 0) return;
    setFile(selected[0]);
    setWatermarkText("");
    setPosition("center");
    setOpacity(50);
    setFontSize(48);
  }, []);

  const handleApply = useCallback(async () => {
    if (!file || !watermarkText.trim()) return;

    startProcessing();

    try {
      const blob = await addWatermark(file, watermarkText, position, opacity / 100, fontSize);
      const url = URL.createObjectURL(blob);
      complete(url, "watermarked.pdf");
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    }
  }, [file, watermarkText, position, opacity, fontSize, startProcessing, complete, fail, t]);

  const handleReset = useCallback(() => {
    setFile(null);
    setWatermarkText("");
    setPosition("center");
    setOpacity(50);
    setFontSize(48);
  }, []);

  const positionOptions: { value: WatermarkPosition; labelKey: string }[] = [
    { value: "center", labelKey: "toolPages.positionCenter" },
    { value: "top", labelKey: "toolPages.positionTop" },
    { value: "bottom", labelKey: "toolPages.positionBottom" },
  ];

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
            <>
              <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("toolPages.watermarkText")}
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder={t("toolPages.watermarkTextPlaceholder")}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("toolPages.position")}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {positionOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPosition(opt.value)}
                        className={`rounded-lg border-2 px-3 py-2 text-center text-sm font-medium transition-all ${
                          position === opt.value
                            ? "border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-950 dark:text-brand-300"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600"
                        }`}
                      >
                        {t(opt.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("toolPages.opacity")}: {opacity}%
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={opacity}
                    onChange={(e) => setOpacity(parseInt(e.target.value))}
                    className="w-full accent-brand-600"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("toolPages.fontSize")}
                  </label>
                  <input
                    type="number"
                    min={12}
                    max={200}
                    value={fontSize}
                    onChange={(e) => setFontSize(Math.max(12, parseInt(e.target.value) || 12))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleApply}
                disabled={!watermarkText.trim()}
                className="w-full"
              >
                {t("toolPages.applyWatermark")}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function WatermarkPage() {
  return (
    <ToolPage toolId="watermark">
      <WatermarkContent />
    </ToolPage>
  );
}
