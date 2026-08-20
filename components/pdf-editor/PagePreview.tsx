"use client";

import { useState, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import type { Annotation } from "@/lib/pdf-editor/types";

interface PagePreviewProps {
  pageNumber: number;
  totalPages: number;
  zoom: number;
  annotations: Annotation[];
  activeTool?: string;
  onCommentPlace?: (x: number, y: number) => void;
  onCommentUpdate?: (id: string, text: string) => void;
  onCommentDelete?: (id: string) => void;
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
}: PagePreviewProps) {
  const { t } = useLanguage();
  const scale = zoom / 100;
  const pageWidth = 595;
  const pageHeight = 842;

  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

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

  return (
    <div className="flex flex-1 items-center justify-center overflow-auto bg-gray-200 p-8 dark:bg-gray-900">
      <div
        className="relative bg-white shadow-lg"
        style={{
          width: pageWidth * scale,
          height: pageHeight * scale,
          minWidth: pageWidth * scale,
          minHeight: pageHeight * scale,
          cursor: activeTool === "comment" ? "crosshair" : undefined,
        }}
        onClick={handlePageClick}
      >
        <div className="flex h-full w-full items-center justify-center border border-gray-100">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto mb-3 text-gray-200 dark:text-gray-700"
              style={{ width: 48 * scale, height: 48 * scale }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: Math.max(10, 14 * scale) }}>
              Page {pageNumber} of {totalPages}
            </p>
            <p className="text-gray-300 dark:text-gray-600" style={{ fontSize: Math.max(8, 11 * scale) }}>
              {Math.round(zoom)}% zoom
            </p>
          </div>
        </div>

        {annotations
          .filter((a) => a.pageNumber === pageNumber && a.type !== "comment")
          .map((annotation) => (
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
