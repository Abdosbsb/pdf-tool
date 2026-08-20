"use client";

import { useReducer, useState, useCallback, useEffect } from "react";
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
}

let idCounter = 0;
function generateId() {
  return `ann_${Date.now()}_${++idCounter}`;
}

export default function PdfEditor({ fileId, fileName }: PdfEditorProps) {
  const { t } = useLanguage();
  const [totalPages] = useState(1);

  const [state, dispatch] = useReducer(editorReducer, {
    fileId,
    fileName,
    currentPage: 1,
    totalPages,
    zoom: 75,
    activeTool: "",
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

  const handleExport = useCallback(() => {
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
  }, [state.fileId, state.fileName, state.annotations]);

  const handleApplyTool = useCallback(() => {
    if (!state.activeTool) return;

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

  const handleOptionChange = useCallback((key: string, value: unknown) => {
    setToolOptions((prev) => ({ ...prev, [key]: value }));
  }, []);

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
        />

        <ToolOptions
          activeTool={state.activeTool}
          options={toolOptions}
          onOptionChange={handleOptionChange}
        />
      </div>

      {state.activeTool && (
        <div className="flex items-center justify-center border-t border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={handleApplyTool}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Apply {t(`editor.${state.activeTool === "text" ? "addText" : state.activeTool === "image" ? "addImage" : state.activeTool === "watermark" ? "addWatermark" : state.activeTool === "pageNumbers" ? "addPageNumbers" : state.activeTool === "rotate" ? "rotatePages" : state.activeTool === "crop" ? "cropPages" : state.activeTool}`)}
          </button>
        </div>
      )}
    </div>
  );
}
