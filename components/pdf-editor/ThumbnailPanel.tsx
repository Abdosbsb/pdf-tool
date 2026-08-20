"use client";

import { useRef, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { renderThumbnail } from "@/lib/pdf-editor/pdf-renderer";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface ThumbnailPanelProps {
  pages: number[];
  currentPage: number;
  onPageSelect: (page: number) => void;
  fileId: string;
}

export default function ThumbnailPanel({ pages, currentPage, onPageSelect, fileId }: ThumbnailPanelProps) {
  const { t } = useLanguage();
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (pdfDocRef.current) return;
        const pdfjsLib = await import("pdfjs-dist");
        let source: string | ArrayBuffer;
        if (fileId.startsWith("blob:")) {
          const res = await fetch(fileId);
          source = await res.arrayBuffer();
        } else {
          source = fileId;
        }
        const doc = await pdfjsLib.getDocument(
          typeof source === "string" ? source : { data: source }
        ).promise;
        if (!cancelled) {
          pdfDocRef.current = doc;
        }
      } catch (err) {
        console.error("Thumbnail load error:", err);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [fileId]);

  useEffect(() => {
    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex h-full w-48 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
      <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t("editor.pages")}
        </p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2 scrollbar-thin">
        {pages.map((pageNum) => (
          <ThumbnailItem
            key={pageNum}
            pageNum={pageNum}
            currentPage={currentPage}
            onPageSelect={onPageSelect}
            pdfDoc={pdfDocRef.current}
          />
        ))}
      </div>
    </div>
  );
}

function ThumbnailItem({
  pageNum,
  currentPage,
  onPageSelect,
  pdfDoc,
}: {
  pageNum: number;
  currentPage: number;
  onPageSelect: (page: number) => void;
  pdfDoc: PDFDocumentProxy | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    async function render() {
      if (!canvasRef.current || !pdfDoc || cancelled) return;
      await renderThumbnail(pdfDoc, pageNum, canvasRef.current, 100);
    }
    render();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNum]);

  return (
    <button
      type="button"
      onClick={() => onPageSelect(pageNum)}
      className={`group relative w-full cursor-pointer rounded-lg border-2 p-1 transition-all ${
        currentPage === pageNum
          ? "border-brand-500 bg-brand-50 shadow-sm dark:border-brand-400 dark:bg-brand-950"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
      }`}
    >
      <div className="flex items-center justify-center rounded bg-white dark:bg-gray-700 overflow-hidden">
        {pdfDoc ? (
          <canvas
            ref={canvasRef}
            className="max-w-full"
            style={{ display: "block" }}
          />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
              {pageNum}
            </span>
          </div>
        )}
      </div>
      <div className="mt-1 flex items-center justify-center">
        <span
          className={`text-xs font-medium ${
            currentPage === pageNum
              ? "text-brand-600 dark:text-brand-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {pageNum}
        </span>
      </div>
    </button>
  );
}
