"use client";

import Button from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";

interface ToolbarProps {
  activeTool: string;
  onToolSelect: (tool: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitPage: () => void;
  currentPage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

const tools = [
  { id: "text", icon: "M4 6h16M4 12h8m-8 6h16", label: "editor.addText" },
  { id: "comment", icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z", label: "editor.addComment" },
  { id: "image", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", label: "editor.addImage" },
  { id: "watermark", icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z", label: "editor.addWatermark" },
  { id: "pageNumbers", icon: "M7 20l4-16m2 16l4-16M6 9h14M4 15h14", label: "editor.addPageNumbers" },
  { id: "draw", icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z", label: "editor.draw" },
  { id: "highlight", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", label: "editor.highlight" },
];

export default function Toolbar({
  activeTool,
  onToolSelect,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  zoom,
  onZoomIn,
  onZoomOut,
  onFitPage,
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
}: ToolbarProps) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-1 border-b border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => onToolSelect(tool.id)}
            title={t(tool.label)}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
              activeTool === tool.id
                ? "bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={tool.icon} />
            </svg>
          </button>
        ))}
      </div>

      <div className="mx-2 h-6 w-px bg-gray-200 dark:bg-gray-700" />

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title={t("editor.undo")}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title={t("editor.redo")}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>

      <div className="mx-2 h-6 w-px bg-gray-200 dark:bg-gray-700" />

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrevPage}
          disabled={currentPage <= 1}
          title={t("editor.prevPage")}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="min-w-[80px] text-center text-xs font-medium text-gray-600 dark:text-gray-300">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
          title={t("editor.nextPage")}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="mx-2 h-6 w-px bg-gray-200 dark:bg-gray-700" />

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onZoomOut}
          title={t("editor.zoomOut")}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onFitPage}
          className="min-w-[48px] rounded-md px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {Math.round(zoom)}%
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          title={t("editor.zoomIn")}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onFitPage}
          title={t("editor.fitPage")}
          className="flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          {t("editor.fitPage")}
        </button>
      </div>

      <div className="flex-1" />

      <Button variant="primary" size="sm" onClick={onExport}>
        <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {t("editor.export")}
      </Button>
    </div>
  );
}
