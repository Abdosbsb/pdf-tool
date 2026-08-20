"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { renderPageToCanvas } from "@/lib/pdf-editor/pdf-renderer";
import type { Annotation } from "@/lib/pdf-editor/types";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface PagePreviewProps {
  pageNumber: number;
  totalPages: number;
  zoom: number;
  annotations: Annotation[];
  activeTool?: string;
  onCommentPlace?: (x: number, y: number) => void;
  onCommentUpdate?: (id: string, text: string) => void;
  onCommentDelete?: (id: string) => void;
  fileId: string;
  pageWidth: number;
  pageHeight: number;
}

export default function PagePreview({
  pageNumber,
  totalPages,
  zoom,
  annotations,
  activeTool,
  onCommentPlace,
  onCommentUpdate,
  onCommentDelete,
  fileId,
  pageWidth,
  pageHeight,
}: PagePreviewProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const [rendering, setRendering] = useState(false);

  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAndRender() {
      if (!canvasRef.current) return;
      setRendering(true);

      try {
        if (!pdfDocRef.current) {
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
          if (cancelled) return;
          pdfDocRef.current = doc;
        }

        if (canvasRef.current && pdfDocRef.current && !cancelled) {
          const scale = zoom / 100;
          await renderPageToCanvas(pdfDocRef.current, pageNumber, canvasRef.current, scale);
        }
      } catch (err) {
        console.error("PDF render error:", err);
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    loadAndRender();
    return () => { cancelled = true; };
  }, [pageNumber, zoom, fileId]);

  useEffect(() => {
    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, []);

  const scale = zoom / 100;
  const displayWidth = pageWidth * scale;
  const displayHeight = pageHeight * scale;

  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool !== "comment" || !onCommentPlace) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      onCommentPlace(x, y);
    },
    [activeTool, onCommentPlace, scale]
  );

  const handleCommentClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (selectedComment === id) {
        setSelectedComment(null);
      } else {
        setSelectedComment(id);
        setEditingComment(null);
      }
    },
    [selectedComment]
  );

  const handleEditStart = useCallback(
    (id: string, currentText: string) => {
      setEditingComment(id);
      setEditText(currentText);
    },
    []
  );

  const handleEditSave = useCallback(
    (id: string) => {
      if (onCommentUpdate && editText.trim()) {
        onCommentUpdate(id, editText.trim());
      }
      setEditingComment(null);
      setEditText("");
    },
    [editText, onCommentUpdate]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (onCommentDelete) {
        onCommentDelete(id);
      }
      setSelectedComment(null);
    },
    [onCommentDelete]
  );

  const comments = annotations.filter(
    (a) => a.type === "comment" && a.pageNumber === pageNumber
  );

  const nonCommentAnnotations = annotations.filter(
    (a) => a.pageNumber === pageNumber && a.type !== "comment"
  );

  return (
    <div className="flex flex-1 items-center justify-center overflow-auto bg-gray-200 p-8 dark:bg-gray-900">
      <div
        className="relative bg-white shadow-lg"
        style={{
          width: displayWidth,
          height: displayHeight,
          minWidth: displayWidth,
          minHeight: displayHeight,
          cursor: activeTool === "comment" ? "crosshair" : undefined,
        }}
        onClick={handlePageClick}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        />

        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70">
            <div className="text-sm text-gray-500">Rendering...</div>
          </div>
        )}

        {nonCommentAnnotations.map((annotation) => (
          <div
            key={annotation.id}
            className="absolute pointer-events-none"
            style={{
              left: annotation.x * scale,
              top: annotation.y * scale,
              width: annotation.width ? annotation.width * scale : undefined,
              height: annotation.height ? annotation.height * scale : undefined,
              opacity: annotation.opacity ?? 1,
              transform: annotation.rotation ? `rotate(${annotation.rotation}deg)` : undefined,
            }}
          >
            {annotation.type === "text" && (
              <p
                style={{
                  color: annotation.color || "#000",
                  fontSize: (annotation.fontSize || 16) * scale,
                }}
              >
                {annotation.content}
              </p>
            )}
            {annotation.type === "watermark" && (
              <p
                className="whitespace-nowrap font-bold"
                style={{
                  color: annotation.color || "#ccc",
                  fontSize: (annotation.fontSize || 36) * scale,
                }}
              >
                {annotation.content}
              </p>
            )}
            {annotation.type === "pageNumber" && (
              <p
                style={{
                  color: annotation.color || "#333",
                  fontSize: (annotation.fontSize || 12) * scale,
                }}
              >
                {pageNumber}
              </p>
            )}
            {annotation.type === "highlight" && (
              <div
                className="rounded"
                style={{
                  backgroundColor: annotation.color || "#FFD700",
                  width: "100%",
                  height: "100%",
                }}
              />
            )}
            {annotation.type === "image" && (
              <div className="flex items-center justify-center border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
                Image
              </div>
            )}
          </div>
        ))}

        {comments.map((comment) => {
          const isSelected = selectedComment === comment.id;
          const isEditing = editingComment === comment.id;
          const markerSize = Math.max(20, 24 * scale);

          return (
            <div
              key={comment.id}
              className="absolute"
              style={{
                left: comment.x * scale - markerSize / 2,
                top: comment.y * scale - markerSize / 2,
                zIndex: isSelected ? 20 : 10,
              }}
            >
              <button
                type="button"
                onClick={(e) => handleCommentClick(e, comment.id)}
                className="flex items-center justify-center rounded-full shadow-md transition-transform hover:scale-110"
                style={{
                  width: markerSize,
                  height: markerSize,
                  backgroundColor: comment.color || "#FF0000",
                  fontSize: Math.max(10, 12 * scale),
                }}
                title={comment.content || ""}
              >
                <span className="text-white font-bold">
                  {comments.indexOf(comment) + 1}
                </span>
              </button>

              {isSelected && !isEditing && (
                <div
                  className="absolute z-30 mt-1 min-w-[200px] max-w-[300px] rounded-lg border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-600 dark:bg-gray-800"
                  style={{ direction: "ltr", left: "50%", transform: "translateX(-50%)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="mb-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditStart(comment.id, comment.content || "")}
                      className="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950"
                    >
                      {t("editor.editComment")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      {t("editor.deleteComment")}
                    </button>
                  </div>
                </div>
              )}

              {isSelected && isEditing && (
                <div
                  className="absolute z-30 mt-1 min-w-[200px] max-w-[300px] rounded-lg border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-600 dark:bg-gray-800"
                  style={{ left: "50%", transform: "translateX(-50%)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="mb-2 w-full resize-none rounded border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditSave(comment.id)}
                      className="rounded bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700"
                    >
                      {t("common.save")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingComment(null)}
                      className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
