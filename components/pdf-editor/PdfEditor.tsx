"use client";

import { useReducer, useState, useCallback, useEffect, useRef } from "react";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { editorReducer } from "@/lib/pdf-editor/reducer";
import type { Annotation, EditorState } from "@/lib/pdf-editor/types";
import { loadPdf, type PdfPageInfo } from "@/lib/pdf-editor/pdf-renderer";
import ThumbnailPanel from "./ThumbnailPanel";
import Toolbar from "./Toolbar";
import ToolOptions from "./ToolOptions";
import PagePreview from "./PagePreview";
import Spinner from "@/components/ui/Spinner";

interface PdfEditorProps {
  fileId: string;
  fileName: string;
  initialTool?: string;
}

let idCounter = 0;
function generateId() {
  return `ann_${Date.now()}_${++idCounter}`;
}

export default function PdfEditor({ fileId, fileName, initialTool }: PdfEditorProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageInfos, setPageInfos] = useState<PdfPageInfo[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string>("");
  const pdfBytesRef = useRef<Uint8Array | null>(null);

  const [state, dispatch] = useReducer(editorReducer, {
    fileId,
    fileName,
    currentPage: 1,
    totalPages: 1,
    zoom: 75,
    activeTool: initialTool || "",
    annotations: [],
    history: [[]],
    historyIndex: 0,
    selectedAnnotationId: null,
  } satisfies EditorState);

  const [toolOptions, setToolOptions] = useState<Record<string, unknown>>({
    text: "",
    fontSize: 16,
    color: "#000000",
    x: 100,
    y: 100,
    opacity: 0.3,
    position: "center",
    rotation: 90,
    startNumber: 1,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    lineWidth: 2,
    commentText: "",
  });

  useEffect(() => {
    document.title = `${fileName} - PDFCraft Editor`;
  }, [fileName]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        dispatch({ type: "REDO" });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selectedAnnotationId) {
          e.preventDefault();
          dispatch({ type: "REMOVE_ANNOTATION", payload: state.selectedAnnotationId });
          dispatch({ type: "SELECT_ANNOTATION", payload: null });
        }
      } else if (e.key === "Escape") {
        dispatch({ type: "SELECT_ANNOTATION", payload: null });
        dispatch({ type: "SET_TOOL", payload: "" });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.selectedAnnotationId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await loadPdf(fileId);
        if (cancelled) return;
        setPageInfos(result.pages);
        setTotalPages(result.totalPages);
        dispatch({ type: "SET_TOTAL_PAGES", payload: result.totalPages });

        const res = await fetch(fileId);
        const buf = await res.arrayBuffer();
        if (!cancelled) {
          pdfBytesRef.current = new Uint8Array(buf);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Unable to load this PDF.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [fileId]);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const handleToolSelect = useCallback(
    (tool: string) => {
      const nextTool = state.activeTool === tool ? "" : tool;
      dispatch({ type: "SET_TOOL", payload: nextTool });
      dispatch({ type: "SELECT_ANNOTATION", payload: null });
    },
    [state.activeTool]
  );

  const handlePageSelect = useCallback(
    (page: number) => {
      dispatch({ type: "SET_PAGE", payload: page });
    },
    []
  );

  const handleZoomIn = useCallback(() => {
    dispatch({ type: "SET_ZOOM", payload: state.zoom + 25 });
  }, [state.zoom]);

  const handleZoomOut = useCallback(() => {
    dispatch({ type: "SET_ZOOM", payload: Math.max(25, state.zoom - 25) });
  }, [state.zoom]);

  const handleFitPage = useCallback(() => {
    dispatch({ type: "SET_ZOOM", payload: 75 });
  }, []);

  const handlePrevPage = useCallback(() => {
    if (state.currentPage > 1) {
      dispatch({ type: "SET_PAGE", payload: state.currentPage - 1 });
    }
  }, [state.currentPage]);

  const handleNextPage = useCallback(() => {
    if (state.currentPage < totalPages) {
      dispatch({ type: "SET_PAGE", payload: state.currentPage + 1 });
    }
  }, [state.currentPage, totalPages]);

  const handleUndo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  const handleRedo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, []);

  const handleExport = useCallback(async () => {
    if (!pdfBytesRef.current) return;
    setExporting(true);

    try {
      const pdfDoc = await PDFDocument.load(pdfBytesRef.current);
      const libPages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const annotationsByPage = new Map<number, Annotation[]>();
      for (const ann of state.annotations) {
        const existing = annotationsByPage.get(ann.pageNumber) || [];
        existing.push(ann);
        annotationsByPage.set(ann.pageNumber, existing);
      }

      for (const [pageNum, anns] of annotationsByPage) {
        const pageIdx = pageNum - 1;
        if (pageIdx < 0 || pageIdx >= libPages.length) continue;
        const page = libPages[pageIdx];
        const { width, height } = page.getSize();
        const pageInfo = pageInfos.find((p) => p.pageNumber === pageNum);
        const pageHeight = pageInfo ? pageInfo.height : height;
        const pageWidth = pageInfo ? pageInfo.width : width;
        const scaleX = width / pageWidth;
        const scaleY = height / pageHeight;

        for (const ann of anns) {
          const pdfX = ann.x * scaleX;
          const pdfY = height - ann.y * scaleY;

          switch (ann.type) {
            case "text": {
              const fontSize = ann.fontSize || 16;
              const text = ann.content || "";
              page.drawText(text, {
                x: pdfX,
                y: pdfY - fontSize,
                size: fontSize,
                font,
                color: parseHexColor(ann.color || "#000000"),
              });
              break;
            }

            case "comment": {
              const commentIdx = anns.filter((a) => a.type === "comment").indexOf(ann);
              const fontSize = ann.fontSize || 14;
              const label = String(commentIdx + 1);

              page.drawCircle({
                x: pdfX,
                y: pdfY,
                size: 10,
                color: parseHexColor(ann.color || "#FF0000"),
              });

              page.drawText(label, {
                x: pdfX - font.widthOfTextAtSize(label, fontSize * 0.8) / 2,
                y: pdfY - fontSize * 0.3,
                size: fontSize * 0.8,
                font: boldFont,
                color: rgb(1, 1, 1),
              });

              if (ann.content) {
                const textLines = wrapText(ann.content, font, fontSize, width - pdfX - 40);
                const textHeight = textLines.length * (fontSize + 4);
                const boxX = pdfX + 15;
                const boxY = pdfY - textHeight / 2;
                const maxLineWidth = Math.max(...textLines.map((l) => font.widthOfTextAtSize(l, fontSize)));
                const boxWidth = maxLineWidth + 20;

                page.drawRectangle({
                  x: boxX,
                  y: boxY - 5,
                  width: boxWidth,
                  height: textHeight + 10,
                  borderColor: parseHexColor(ann.color || "#FF0000"),
                  borderWidth: 1,
                  color: rgb(1, 1, 1),
                  opacity: 0.95,
                });

                for (let i = 0; i < textLines.length; i++) {
                  page.drawText(textLines[i], {
                    x: boxX + 10,
                    y: boxY + textHeight - (i + 1) * (fontSize + 4),
                    size: fontSize,
                    font,
                    color: parseHexColor("#333333"),
                  });
                }
              }
              break;
            }

            case "watermark": {
              const fontSize = ann.fontSize || 36;
              const text = ann.content || "WATERMARK";
              const opacity = ann.opacity ?? 0.3;
              const rotation = ann.rotation ?? 0;
              const textWidth = font.widthOfTextAtSize(text, fontSize);
              let x = pdfX;
              let y = pdfY - fontSize;

              const pos = (toolOptions.position as string) || "center";
              if (pos === "center") {
                x = (width - textWidth) / 2;
                y = height / 2;
              } else if (pos === "top") {
                x = (width - textWidth) / 2;
                y = height - fontSize - 50;
              } else if (pos === "bottom") {
                x = (width - textWidth) / 2;
                y = 50;
              }

              page.drawText(text, {
                x,
                y,
                size: fontSize,
                font,
                color: parseHexColor(ann.color || "#cccccc"),
                opacity,
                rotate: degrees(-rotation),
              });
              break;
            }

            case "pageNumber": {
              const fontSize = ann.fontSize || 12;
              const text = String(pageNum);
              const textWidth = font.widthOfTextAtSize(text, fontSize);
              const pos = (toolOptions.position as string) || "bottom-center";
              let x = pdfX;
              let y = pdfY;

              if (pos === "bottom-center") {
                x = (width - textWidth) / 2;
                y = 30;
              } else if (pos === "bottom-left") {
                x = 30;
                y = 30;
              } else if (pos === "bottom-right") {
                x = width - textWidth - 30;
                y = 30;
              } else if (pos === "center") {
                x = (width - textWidth) / 2;
                y = height / 2;
              } else if (pos === "top") {
                x = (width - textWidth) / 2;
                y = height - 30 - fontSize;
              }

              page.drawText(text, {
                x,
                y,
                size: fontSize,
                font,
                color: parseHexColor(ann.color || "#333333"),
              });
              break;
            }

            case "highlight": {
              const opacity = ann.opacity ?? 0.3;
              const hWidth = ann.width || 200;
              const hHeight = ann.height || 30;
              page.drawRectangle({
                x: pdfX,
                y: pdfY - hHeight,
                width: hWidth * scaleX,
                height: hHeight,
                color: parseHexColor(ann.color || "#FFD700"),
                opacity,
              });
              break;
            }

            case "draw": {
              if (ann.points && ann.points.length > 1) {
                const lineColor = parseHexColor(ann.color || "#000000");
                const lineW = ann.lineWidth || 2;
                for (let i = 0; i < ann.points.length - 1; i++) {
                  const p1 = ann.points[i];
                  const p2 = ann.points[i + 1];
                  page.drawLine({
                    start: { x: pdfX + p1.x * scaleX, y: pdfY - p1.y * scaleY },
                    end: { x: pdfX + p2.x * scaleX, y: pdfY - p2.y * scaleY },
                    thickness: lineW,
                    color: lineColor,
                  });
                }
              }
              break;
            }
          }
        }
      }

      const modifiedBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(modifiedBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const outputName = `${state.fileName.replace(/\.pdf$/i, "")}_edited.pdf`;
      setResultUrl(url);
      setResultName(outputName);
    } catch (err) {
      console.error("Export failed:", err);
      throw err;
    } finally {
      setExporting(false);
    }
  }, [state.annotations, state.fileName, pageInfos, toolOptions.position]);

  const handleAnnotationSelect = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_ANNOTATION", payload: id });
  }, []);

  const handleAnnotationDrag = useCallback((id: string, x: number, y: number) => {
    dispatch({ type: "UPDATE_ANNOTATION", payload: { id, changes: { x, y } } });
  }, []);

  const handleAnnotationResize = useCallback((id: string, width: number, height: number) => {
    dispatch({ type: "UPDATE_ANNOTATION", payload: { id, changes: { width, height } } });
  }, []);

  const handleAnnotationRotate = useCallback((id: string, rotation: number) => {
    dispatch({ type: "UPDATE_ANNOTATION", payload: { id, changes: { rotation: Math.round(rotation) } } });
  }, []);

  const handleAnnotationUpdate = useCallback((id: string, changes: Partial<Annotation>) => {
    dispatch({ type: "UPDATE_ANNOTATION", payload: { id, changes } });
  }, []);

  const handleDrawComplete = useCallback((annotation: Annotation) => {
    dispatch({ type: "ADD_ANNOTATION", payload: annotation });
    dispatch({ type: "SELECT_ANNOTATION", payload: annotation.id });
  }, []);

  const handleAnnotationDelete = useCallback((id: string) => {
    dispatch({ type: "REMOVE_ANNOTATION", payload: id });
    dispatch({ type: "SELECT_ANNOTATION", payload: null });
  }, []);

  const handleAnnotationDuplicate = useCallback((id: string) => {
    const ann = state.annotations.find((a) => a.id === id);
    if (!ann) return;
    const duplicate: Annotation = {
      ...ann,
      id: generateId(),
      x: ann.x + 20,
      y: ann.y + 20,
    };
    dispatch({ type: "ADD_ANNOTATION", payload: duplicate });
    dispatch({ type: "SELECT_ANNOTATION", payload: duplicate.id });
  }, [state.annotations]);

  const handlePagePlace = useCallback(
    (x: number, y: number) => {
      if (!state.activeTool || state.activeTool === "comment" || state.activeTool === "draw") return;

      const annotation: Annotation = {
        id: generateId(),
        type: state.activeTool as Annotation["type"],
        pageNumber: state.currentPage,
        x,
        y,
        content: state.activeTool === "text" ? ((toolOptions.text as string) || "Text") : undefined,
        fontSize: (toolOptions.fontSize as number) || undefined,
        color: (toolOptions.color as string) || undefined,
        opacity: (toolOptions.opacity as number) || undefined,
        rotation: (toolOptions.rotation as number) || undefined,
        width: (toolOptions.width as number) || 200,
        height: state.activeTool === "highlight" ? 30 : undefined,
      };

      if (annotation.type === "pageNumber") {
        annotation.content = String(state.currentPage);
      }
      if (annotation.type === "watermark") {
        annotation.content = (toolOptions.text as string) || "WATERMARK";
      }

      dispatch({ type: "ADD_ANNOTATION", payload: annotation });
      dispatch({ type: "SELECT_ANNOTATION", payload: annotation.id });
    },
    [state.activeTool, state.currentPage, toolOptions]
  );

  const handleCommentPlace = useCallback(
    (x: number, y: number) => {
      const text = (toolOptions.commentText as string) || "";
      const annotation: Annotation = {
        id: generateId(),
        type: "comment",
        pageNumber: state.currentPage,
        x,
        y,
        content: text,
        fontSize: (toolOptions.fontSize as number) || 14,
        color: (toolOptions.color as string) || "#FF0000",
      };
      dispatch({ type: "ADD_ANNOTATION", payload: annotation });
      setToolOptions((prev) => ({ ...prev, commentText: "" }));
    },
    [state.currentPage, toolOptions]
  );

  const handleCommentUpdate = useCallback((id: string, text: string) => {
    dispatch({ type: "UPDATE_ANNOTATION", payload: { id, changes: { content: text } } });
  }, []);

  const handleCommentDelete = useCallback((id: string) => {
    dispatch({ type: "REMOVE_ANNOTATION", payload: id });
  }, []);

  const handleOptionChange = useCallback((key: string, value: unknown) => {
    setToolOptions((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleDownloadResult = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = resultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [resultUrl, resultName]);

  const handleBackToEditor = useCallback(() => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setResultName("");
  }, [resultUrl]);

  const currentPageInfo = pageInfos.find((p) => p.pageNumber === state.currentPage);

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Loading PDF...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            Unable to load this PDF.
          </p>
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {loadError}
          </p>
        </div>
      </div>
    );
  }

  if (resultUrl) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <div>
            <h2 className="text-sm font-bold text-gray-800 dark:text-white">
              Edited File
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{resultName}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBackToEditor}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Back to Editor
            </button>
            <button
              type="button"
              onClick={handleDownloadResult}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Download
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-200 p-4 dark:bg-gray-900">
          <iframe
            src={resultUrl}
            className="mx-auto block h-full w-full max-w-3xl border border-gray-300 bg-white shadow-lg dark:border-gray-600"
            style={{ minHeight: "calc(100vh - 80px)" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white dark:bg-gray-900">
      <Toolbar
        activeTool={state.activeTool}
        onToolSelect={handleToolSelect}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={state.historyIndex > 0}
        canRedo={state.historyIndex < state.history.length - 1}
        onExport={handleExport}
        zoom={state.zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitPage={handleFitPage}
        currentPage={state.currentPage}
        totalPages={totalPages}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
      />

      <div className="flex flex-1 overflow-hidden">
        <ThumbnailPanel
          pages={pages}
          currentPage={state.currentPage}
          onPageSelect={handlePageSelect}
          fileId={fileId}
        />

        <PagePreview
          pageNumber={state.currentPage}
          totalPages={totalPages}
          zoom={state.zoom}
          annotations={state.annotations}
          activeTool={state.activeTool}
          selectedAnnotationId={state.selectedAnnotationId}
          onAnnotationSelect={handleAnnotationSelect}
          onAnnotationDrag={handleAnnotationDrag}
          onAnnotationResize={handleAnnotationResize}
          onAnnotationRotate={handleAnnotationRotate}
          onAnnotationUpdate={handleAnnotationUpdate}
          onAnnotationDelete={handleAnnotationDelete}
          onAnnotationDuplicate={handleAnnotationDuplicate}
          onDrawComplete={handleDrawComplete}
          onCommentPlace={handleCommentPlace}
          onCommentUpdate={handleCommentUpdate}
          onCommentDelete={handleCommentDelete}
          onPagePlace={handlePagePlace}
          fileId={fileId}
          pageWidth={currentPageInfo?.width || 595}
          pageHeight={currentPageInfo?.height || 842}
          toolOptions={toolOptions}
        />

        <ToolOptions
          activeTool={state.activeTool}
          options={toolOptions}
          onOptionChange={handleOptionChange}
        />
      </div>

      {state.annotations.length > 0 && (
        <div className="flex items-center justify-center border-t border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {exporting ? (
              <>
                <Spinner size="sm" />
                Exporting...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export PDF ({state.annotations.length} edit{state.annotations.length !== 1 ? "s" : ""})
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function parseHexColor(hex: string) {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.substring(0, 2), 16) / 255;
  const g = parseInt(cleaned.substring(2, 4), 16) / 255;
  const b = parseInt(cleaned.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function wrapText(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, fontSize: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [text.substring(0, 30)];
}
