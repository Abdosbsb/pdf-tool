"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import FileUpload from "@/components/upload/FileUpload";
import InputPreview from "@/components/file-preview/InputPreview";
import Button from "@/components/ui/Button";
import { reorderPages } from "@/lib/pdf/client-processor";

function ReorderPagesContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail } = useToolPage();
  const [file, setFile] = useState<File | null>(null);
  const [newOrder, setNewOrder] = useState("");

  useEffect(() => {
    document.title = `${t("toolPages.reorderPages")} - PDFCraft`;
  }, [t]);

  const handleFileSelected = useCallback((selected: File[]) => {
    if (selected.length === 0) return;
    setFile(selected[0]);
    setNewOrder("");
  }, []);

  const parseOrder = useCallback((input: string): number[] => {
    const order: number[] = [];
    const parts = input.split(",").map((s) => s.trim());
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (!isNaN(num)) order.push(num - 1);
    }
    return order;
  }, []);

  const handleReorder = useCallback(async () => {
    if (!file || !newOrder.trim()) return;

    startProcessing();

    try {
      const order = parseOrder(newOrder);
      if (order.length === 0) {
        throw new Error(t("toolPages.invalidPageRange"));
      }

      const blob = await reorderPages(file, order);
      const url = URL.createObjectURL(blob);
      complete(url, "reordered.pdf");
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    }
  }, [file, newOrder, startProcessing, complete, fail, t, parseOrder]);

  const handleReset = useCallback(() => {
    setFile(null);
    setNewOrder("");
  }, []);

  return (
    <div className="space-y-4">
      {!file && (state === "idle" || state === "failed") && (
        <FileUpload
          accept={["pdf"]}
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
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("toolPages.newPageOrder")}
                </p>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  {t("toolPages.newPageOrderHint")}
                </p>
                <input
                  type="text"
                  value={newOrder}
                  onChange={(e) => setNewOrder(e.target.value)}
                  placeholder={t("toolPages.newPageOrderPlaceholder")}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleReorder}
                disabled={!newOrder.trim()}
                className="w-full"
              >
                {t("toolPages.reorderPages")}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function ReorderPagesPage() {
  return (
    <ToolPage toolId="reorder-pages">
      <ReorderPagesContent />
    </ToolPage>
  );
}
