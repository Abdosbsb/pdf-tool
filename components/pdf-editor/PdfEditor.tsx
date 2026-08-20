"use client";

import { useReducer, useState, useCallback, useEffect } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { useLanguage } from "@/context/LanguageContext";
import { editorReducer } from "@/lib/pdf-editor/reducer";
import type { Annotation, EditorState } from "@/lib/pdf-editor/types";
import ThumbnailPanel from "./ThumbnailPanel";
import Toolbar from "./Toolbar";
import ToolOptions from "./ToolOptions";
import PagePreview from "./PagePreview";

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
  const { t } = useLanguage();
  const [totalPages] = useState(1);

  const [state, dispatch] = useReducer(editorReducer, {
    fileId,
    fileName,
    currentPage: 1,
    totalPages,
    zoom: 75,
    activeTool: initialTool || "",
    annotations: [],
    history: [[]],
    historyIndex: 0,
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

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const handleToolSelect = useCallback(
    (tool: string) => {
      dispatch({ type: "SET_TOOL", payload: state.activeTool === tool ? "" : tool });
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
    dispatch({ type: "SET_ZOOM", payload: state.zoom - 25 });
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
    try {
      let pdfBytes: Uint8Array;

      if (fileId.startsWith("blob:")) {
        const res = await fetch(fileId);
        const arrayBuf = await res.arrayBuffer();
        pdfBytes = new Uint8Array(arrayBuf);
      } else {
        const res = await fetch(fileId);
        const arrayBuf = await res.arrayBuffer();
        pdfBytes = new Uint8Array(arrayBuf);
      }

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      const comments = state.annotations.filter((a) => a.type === "comment");

      for (const comment of comments) {
        const pageIdx = comment.pageNumber - 1;
        if (pageIdx < 0 || pageIdx >= pages.length) continue;
        const page = pages[pageIdx];
        const { width, height } = page.getSize();

        const pdfX = comment.x;
        const pdfY = height - comment.y;

        const fontSize = comment.fontSize || 14;
        const font = await pdfDoc.embedFont("Helvetica");

        const bubbleWidth = Math.max(24, font.widthOfTextAtSize(String(comments.indexOf(comment) + 1), fontSize));
        const bubbleHeight = 20;

        page.drawCircle({
          x: pdfX,
          y: pdfY,
          size: bubbleHeight / 2,
          color: parseHexColor(comment.color || "#FF0000"),
        });

        page.drawText(String(comments.indexOf(comment) + 1), {
          x: pdfX - font.widthOfTextAtSize(String(comments.indexOf(comment) + 1), fontSize * 0.8) / 2,
          y: pdfY - fontSize * 0.35,
          size: fontSize * 0.8,
          font,
          color: parseHexColor("#FFFFFF"),
        });

        if (comment.content) {
          const textLines = wrapText(comment.content, font, fontSize, width - 80);
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
            borderColor: parseHexColor(comment.color || "#FF0000"),
            borderWidth: 1,
            color: parseHexColor("#FFFFFF"),
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
      }

      const modifiedBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(modifiedBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.fileName.replace(/\.pdf$/i, "")}_edited.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      const blob = new Blob(
        [
          JSON.stringify(
            {
              fileId: state.fileId,
              fileName: state.fileName,
              annotations: state.annotations,
            },
            null,
            2
          ),
        ],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.fileName.replace(/\.pdf$/i, "")}_edited.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [state.fileId, state.fileName, state.annotations]);

  const handleApplyTool = useCallback(() => {
    if (!state.activeTool) return;
    if (state.activeTool === "comment") return;

    const annotation: Annotation = {
      id: generateId(),
      type: state.activeTool as Annotation["type"],
      pageNumber: state.currentPage,
      x: (toolOptions.x as number) || 100,
      y: (toolOptions.y as number) || 100,
      content: (toolOptions.text as string) || undefined,
      fontSize: (toolOptions.fontSize as number) || undefined,
      color: (toolOptions.color as string) || undefined,
      opacity: (toolOptions.opacity as number) || undefined,
      rotation: (toolOptions.rotation as number) || undefined,
      width: (toolOptions.width as number) || undefined,
    };

    if (annotation.type === "pageNumber") {
      annotation.content = String(state.currentPage);
    }

    dispatch({ type: "ADD_ANNOTATION", payload: annotation });
  }, [state.activeTool, state.currentPage, toolOptions]);

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

  const toolLabel = state.activeTool === "comment"
    ? t("editor.addComment")
    : t(`editor.${state.activeTool === "text" ? "addText" : state.activeTool === "image" ? "addImage" : state.activeTool === "watermark" ? "addWatermark" : state.activeTool === "pageNumbers" ? "addPageNumbers" : state.activeTool === "rotate" ? "rotatePages" : state.activeTool === "crop" ? "cropPages" : state.activeTool}`);

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
        />

        <PagePreview
          pageNumber={state.currentPage}
          totalPages={totalPages}
          zoom={state.zoom}
          annotations={state.annotations}
          activeTool={state.activeTool}
          onCommentPlace={handleCommentPlace}
          onCommentUpdate={handleCommentUpdate}
          onCommentDelete={handleCommentDelete}
        />

        <ToolOptions
          activeTool={state.activeTool}
          options={toolOptions}
          onOptionChange={handleOptionChange}
        />
      </div>

      {state.activeTool && state.activeTool !== "comment" && (
        <div className="flex items-center justify-center border-t border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={handleApplyTool}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Apply {toolLabel}
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
