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
  selectedAnnotationId?: string | null;
  onAnnotationSelect?: (id: string | null) => void;
  onAnnotationDrag?: (id: string, x: number, y: number) => void;
  onAnnotationResize?: (id: string, width: number, height: number) => void;
  onAnnotationRotate?: (id: string, rotation: number) => void;
  onAnnotationUpdate?: (id: string, changes: Partial<Annotation>) => void;
  onDrawComplete?: (annotation: Annotation) => void;
  onCommentPlace?: (x: number, y: number) => void;
  onCommentUpdate?: (id: string, text: string) => void;
  onCommentDelete?: (id: string) => void;
  fileId: string;
  pageWidth: number;
  pageHeight: number;
  toolOptions?: Record<string, unknown>;
}

interface DragState {
  annotationId: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
}

interface ResizeState {
  annotationId: string;
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
  corner: "nw" | "ne" | "sw" | "se";
}

interface RotateState {
  annotationId: string;
  centerX: number;
  centerY: number;
  startAngle: number;
  startRotation: number;
}

export default function PagePreview({
  pageNumber,
  totalPages,
  zoom,
  annotations,
  activeTool,
  selectedAnnotationId,
  onAnnotationSelect,
  onAnnotationDrag,
  onAnnotationResize,
  onAnnotationRotate,
  onAnnotationUpdate,
  onDrawComplete,
  onCommentPlace,
  onCommentUpdate,
  onCommentDelete,
  fileId,
  pageWidth,
  pageHeight,
  toolOptions,
}: PagePreviewProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const [rendering, setRendering] = useState(false);

  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [editAnnotationText, setEditAnnotationText] = useState("");

  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const rotateRef = useRef<RotateState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

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

  const getPointerPosition = useCallback((e: React.PointerEvent | PointerEvent) => {
    const target = containerRef.current || (e.target as HTMLElement).closest("[data-page-container]");
    if (!target) return { x: 0, y: 0 };
    const rect = target.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  }, [scale]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (activeTool === "draw") {
      e.preventDefault();
      e.stopPropagation();
      setIsDrawing(true);
      const pos = getPointerPosition(e);
      setDrawingPoints([pos]);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
  }, [activeTool, getPointerPosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isDrawing && activeTool === "draw") {
      const pos = getPointerPosition(e);
      setDrawingPoints((prev) => [...prev, pos]);
    }
  }, [isDrawing, activeTool, getPointerPosition]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDrawing && activeTool === "draw" && drawingPoints.length > 1) {
      const xs = drawingPoints.map((p) => p.x);
      const ys = drawingPoints.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      const relativePoints = drawingPoints.map((p) => ({
        x: p.x - minX,
        y: p.y - minY,
      }));

      const annotation: Annotation = {
        id: `ann_draw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "draw",
        pageNumber,
        x: minX,
        y: minY,
        width: maxX - minX || 1,
        height: maxY - minY || 1,
        points: relativePoints,
        color: (toolOptions?.color as string) || "#000000",
        lineWidth: (toolOptions?.lineWidth as number) || 2,
      };

      onDrawComplete?.(annotation);

      setIsDrawing(false);
      setDrawingPoints([]);
    } else if (isDrawing) {
      setIsDrawing(false);
      setDrawingPoints([]);
    }
  }, [isDrawing, activeTool, drawingPoints, pageNumber, toolOptions, onDrawComplete]);

  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool === "comment" && onCommentPlace) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        onCommentPlace(x, y);
        return;
      }

      if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "CANVAS") {
        onAnnotationSelect?.(null);
        setSelectedComment(null);
        setEditingComment(null);
        setEditingAnnotation(null);
      }
    },
    [activeTool, onCommentPlace, onAnnotationSelect, scale]
  );

  const handleAnnotationPointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      onAnnotationSelect?.(id);
      setSelectedComment(null);
      setEditingComment(null);

      const ann = annotations.find((a) => a.id === id);
      if (!ann) return;

      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      dragRef.current = {
        annotationId: id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: ann.x,
        startY: ann.y,
      };

      const handlePointerMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        const dx = (ev.clientX - dragRef.current.startClientX) / scale;
        const dy = (ev.clientY - dragRef.current.startClientY) / scale;
        onAnnotationDrag?.(
          dragRef.current.annotationId,
          dragRef.current.startX + dx,
          dragRef.current.startY + dy
        );
      };

      const handlePointerUp = () => {
        dragRef.current = null;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [annotations, scale, onAnnotationSelect, onAnnotationDrag]
  );

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, id: string, corner: "nw" | "ne" | "sw" | "se") => {
      e.stopPropagation();
      const ann = annotations.find((a) => a.id === id);
      if (!ann) return;

      resizeRef.current = {
        annotationId: id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startWidth: ann.width || 200,
        startHeight: ann.height || 30,
        corner,
      };

      const handlePointerMove = (ev: PointerEvent) => {
        if (!resizeRef.current) return;
        const dx = (ev.clientX - resizeRef.current.startClientX) / scale;
        const dy = (ev.clientY - resizeRef.current.startClientY) / scale;

        let newWidth = resizeRef.current.startWidth;
        let newHeight = resizeRef.current.startHeight;

        if (resizeRef.current.corner === "ne" || resizeRef.current.corner === "se") {
          newWidth = Math.max(20, resizeRef.current.startWidth + dx);
        } else {
          newWidth = Math.max(20, resizeRef.current.startWidth - dx);
        }

        if (resizeRef.current.corner === "sw" || resizeRef.current.corner === "se") {
          newHeight = Math.max(10, resizeRef.current.startHeight + dy);
        } else {
          newHeight = Math.max(10, resizeRef.current.startHeight - dy);
        }

        onAnnotationResize?.(resizeRef.current.annotationId, newWidth, newHeight);
      };

      const handlePointerUp = () => {
        resizeRef.current = null;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [annotations, scale, onAnnotationResize]
  );

  const handleRotatePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      const ann = annotations.find((a) => a.id === id);
      if (!ann) return;

      const pageEl = pageContainerRef.current;
      if (!pageEl) return;
      const rect = pageEl.getBoundingClientRect();
      const centerX = ann.x + (ann.width ? ann.width / 2 : 50);
      const centerY = ann.y + (ann.height ? ann.height / 2 : 20);

      const startAngle = Math.atan2(
        e.clientY - rect.top - centerY * scale,
        e.clientX - rect.left - centerX * scale
      );

      rotateRef.current = {
        annotationId: id,
        centerX: ann.x + (ann.width ? ann.width / 2 : 50),
        centerY: ann.y + (ann.height ? ann.height / 2 : 20),
        startAngle,
        startRotation: ann.rotation || 0,
      };

      const handlePointerMove = (ev: PointerEvent) => {
        if (!rotateRef.current) return;
        const currentAngle = Math.atan2(
          ev.clientY - rect.top - centerY * scale,
          ev.clientX - rect.left - centerX * scale
        );
        const deltaDegrees = ((currentAngle - rotateRef.current.startAngle) * 180) / Math.PI;
        const newRotation = rotateRef.current.startRotation + deltaDegrees;
        onAnnotationRotate?.(rotateRef.current.annotationId, newRotation);
      };

      const handlePointerUp = () => {
        rotateRef.current = null;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [annotations, scale, onAnnotationRotate]
  );

  const handleAnnotationDoubleClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const ann = annotations.find((a) => a.id === id);
      if (!ann) return;
      if (ann.type === "text" || ann.type === "watermark") {
        setEditingAnnotation(id);
        setEditAnnotationText(ann.content || "");
      }
    },
    [annotations]
  );

  const handleAnnotationEditSave = useCallback(() => {
    if (editingAnnotation && onAnnotationUpdate) {
      onAnnotationUpdate(editingAnnotation, { content: editAnnotationText });
    }
    setEditingAnnotation(null);
    setEditAnnotationText("");
  }, [editingAnnotation, editAnnotationText, onAnnotationUpdate]);

  const handleCommentClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onAnnotationSelect?.(id);
      if (selectedComment === id) {
        setSelectedComment(null);
      } else {
        setSelectedComment(id);
        setEditingComment(null);
      }
    },
    [selectedComment, onAnnotationSelect]
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
      onCommentDelete?.(id);
      onAnnotationSelect?.(null);
      setSelectedComment(null);
    },
    [onCommentDelete, onAnnotationSelect]
  );

  const comments = annotations.filter(
    (a) => a.type === "comment" && a.pageNumber === pageNumber
  );

  const nonCommentAnnotations = annotations.filter(
    (a) => a.pageNumber === pageNumber && a.type !== "comment"
  );

  const renderDrawPath = (annotation: Annotation) => {
    if (!annotation.points || annotation.points.length < 2) return null;
    const pathData = annotation.points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
    const maxX = Math.max(...annotation.points.map((p) => p.x));
    const maxY = Math.max(...annotation.points.map((p) => p.y));

    return (
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: Math.max(maxX + 10, annotation.width || 0),
          height: Math.max(maxY + 10, annotation.height || 0),
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        <path
          d={pathData}
          stroke={annotation.color || "#000000"}
          strokeWidth={annotation.lineWidth || 2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const renderDrawingPreview = () => {
    if (!isDrawing || drawingPoints.length < 2) return null;
    const pathData = drawingPoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");

    return (
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 30,
          overflow: "visible",
        }}
      >
        <path
          d={pathData}
          stroke={(toolOptions?.color as string) || "#000000"}
          strokeWidth={(toolOptions?.lineWidth as number) || 2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-1 items-center justify-center overflow-auto bg-gray-200 p-8 dark:bg-gray-900"
      data-page-container
    >
      <div
        ref={pageContainerRef}
        className="relative bg-white shadow-lg"
        style={{
          width: displayWidth,
          height: displayHeight,
          minWidth: displayWidth,
          minHeight: displayHeight,
          cursor: activeTool === "comment" ? "crosshair" : activeTool === "draw" ? "crosshair" : undefined,
          touchAction: "none",
        }}
        onClick={handlePageClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
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

        {renderDrawingPreview()}

        {nonCommentAnnotations.map((annotation) => {
          const isSelected = selectedAnnotationId === annotation.id;
          const isEditing = editingAnnotation === annotation.id;

          if (annotation.type === "draw") {
            return (
              <div
                key={annotation.id}
                className="absolute"
                style={{
                  left: annotation.x * scale,
                  top: annotation.y * scale,
                  zIndex: isSelected ? 20 : 5,
                  cursor: "move",
                  outline: isSelected ? "2px solid #2563eb" : undefined,
                  outlineOffset: "2px",
                }}
                onPointerDown={(e) => handleAnnotationPointerDown(e, annotation.id)}
                onDoubleClick={(e) => handleAnnotationDoubleClick(e, annotation.id)}
              >
                <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
                  {renderDrawPath(annotation)}
                </div>
                {isSelected && (
                  <>
                    <div
                      className="absolute -left-1 -top-1 h-2.5 w-2.5 cursor-nw-resize rounded-sm bg-blue-500"
                      onPointerDown={(e) => handleResizePointerDown(e, annotation.id, "nw")}
                    />
                    <div
                      className="absolute -right-1 -top-1 h-2.5 w-2.5 cursor-ne-resize rounded-sm bg-blue-500"
                      onPointerDown={(e) => handleResizePointerDown(e, annotation.id, "ne")}
                    />
                    <div
                      className="absolute -bottom-1 -left-1 h-2.5 w-2.5 cursor-sw-resize rounded-sm bg-blue-500"
                      onPointerDown={(e) => handleResizePointerDown(e, annotation.id, "sw")}
                    />
                    <div
                      className="absolute -bottom-1 -right-1 h-2.5 w-2.5 cursor-se-resize rounded-sm bg-blue-500"
                      onPointerDown={(e) => handleResizePointerDown(e, annotation.id, "se")}
                    />
                  </>
                )}
              </div>
            );
          }

          return (
            <div
              key={annotation.id}
              className="absolute"
              style={{
                left: annotation.x * scale,
                top: annotation.y * scale,
                width: annotation.width ? annotation.width * scale : undefined,
                height: annotation.height ? annotation.height * scale : undefined,
                opacity: annotation.opacity ?? 1,
                transform: annotation.rotation ? `rotate(${annotation.rotation}deg)` : undefined,
                zIndex: isSelected ? 20 : 5,
                cursor: "move",
                outline: isSelected ? "2px solid #2563eb" : undefined,
                outlineOffset: "1px",
              }}
              onPointerDown={(e) => handleAnnotationPointerDown(e, annotation.id)}
              onDoubleClick={(e) => handleAnnotationDoubleClick(e, annotation.id)}
            >
              {annotation.type === "text" && !isEditing && (
                <p
                  style={{
                    color: annotation.color || "#000",
                    fontSize: (annotation.fontSize || 16) * scale,
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {annotation.content || "Text"}
                </p>
              )}
              {annotation.type === "text" && isEditing && (
                <input
                  autoFocus
                  value={editAnnotationText}
                  onChange={(e) => setEditAnnotationText(e.target.value)}
                  onBlur={handleAnnotationEditSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAnnotationEditSave();
                    if (e.key === "Escape") {
                      setEditingAnnotation(null);
                      setEditAnnotationText("");
                    }
                  }}
                  className="border border-blue-500 bg-white px-1 py-0.5 outline-none"
                  style={{
                    color: annotation.color || "#000",
                    fontSize: (annotation.fontSize || 16) * scale,
                    minWidth: 80,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              )}
              {annotation.type === "watermark" && !isEditing && (
                <p
                  className="whitespace-nowrap font-bold"
                  style={{
                    color: annotation.color || "#ccc",
                    fontSize: (annotation.fontSize || 36) * scale,
                    userSelect: "none",
                  }}
                >
                  {annotation.content}
                </p>
              )}
              {annotation.type === "watermark" && isEditing && (
                <input
                  autoFocus
                  value={editAnnotationText}
                  onChange={(e) => setEditAnnotationText(e.target.value)}
                  onBlur={handleAnnotationEditSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAnnotationEditSave();
                    if (e.key === "Escape") {
                      setEditingAnnotation(null);
                      setEditAnnotationText("");
                    }
                  }}
                  className="border border-blue-500 bg-white px-1 py-0.5 font-bold outline-none"
                  style={{
                    color: annotation.color || "#000",
                    fontSize: (annotation.fontSize || 36) * scale,
                    minWidth: 80,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              )}
              {annotation.type === "pageNumber" && (
                <p
                  style={{
                    color: annotation.color || "#333",
                    fontSize: (annotation.fontSize || 12) * scale,
                    userSelect: "none",
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

              {isSelected && annotation.width && (
                <>
                  <div
                    className="absolute -left-1 -top-1 h-2.5 w-2.5 cursor-nw-resize rounded-sm bg-blue-500"
                    onPointerDown={(e) => handleResizePointerDown(e, annotation.id, "nw")}
                  />
                  <div
                    className="absolute -right-1 -top-1 h-2.5 w-2.5 cursor-ne-resize rounded-sm bg-blue-500"
                    onPointerDown={(e) => handleResizePointerDown(e, annotation.id, "ne")}
                  />
                  <div
                    className="absolute -bottom-1 -left-1 h-2.5 w-2.5 cursor-sw-resize rounded-sm bg-blue-500"
                    onPointerDown={(e) => handleResizePointerDown(e, annotation.id, "sw")}
                  />
                  <div
                    className="absolute -bottom-1 -right-1 h-2.5 w-2.5 cursor-se-resize rounded-sm bg-blue-500"
                    onPointerDown={(e) => handleResizePointerDown(e, annotation.id, "se")}
                  />

                  <div
                    className="absolute -top-8 left-1/2 flex h-5 w-5 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] text-gray-500 shadow-sm hover:bg-gray-50"
                    onPointerDown={(e) => handleRotatePointerDown(e, annotation.id)}
                    title="Rotate"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {comments.map((comment) => {
          const isSelected = selectedAnnotationId === comment.id || selectedComment === comment.id;
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
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handleCommentClick(e, comment.id);
                }}
                className="flex items-center justify-center rounded-full shadow-md transition-transform hover:scale-110"
                style={{
                  width: markerSize,
                  height: markerSize,
                  backgroundColor: comment.color || "#FF0000",
                  fontSize: Math.max(10, 12 * scale),
                  outline: isSelected ? "2px solid #2563eb" : undefined,
                  outlineOffset: "2px",
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
