"use client";

import type { Annotation } from "@/lib/pdf-editor/types";

interface PagePreviewProps {
  pageNumber: number;
  totalPages: number;
  zoom: number;
  annotations: Annotation[];
}

export default function PagePreview({ pageNumber, totalPages, zoom, annotations }: PagePreviewProps) {
  const scale = zoom / 100;
  const pageWidth = 595;
  const pageHeight = 842;

  return (
    <div className="flex flex-1 items-center justify-center overflow-auto bg-gray-200 p-8 dark:bg-gray-900">
      <div
        className="relative bg-white shadow-lg"
        style={{
          width: pageWidth * scale,
          height: pageHeight * scale,
          minWidth: pageWidth * scale,
          minHeight: pageHeight * scale,
        }}
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
          .filter((a) => a.pageNumber === pageNumber)
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
      </div>
    </div>
  );
}
