"use client";

import { useLanguage } from "@/context/LanguageContext";

interface ThumbnailPanelProps {
  pages: number[];
  currentPage: number;
  onPageSelect: (page: number) => void;
}

export default function ThumbnailPanel({ pages, currentPage, onPageSelect }: ThumbnailPanelProps) {
  const { t } = useLanguage();

  return (
    <div className="flex h-full w-48 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
      <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t("editor.pages")}
        </p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2 scrollbar-thin">
        {pages.map((pageNum) => (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageSelect(pageNum)}
            className={`group relative w-full cursor-pointer rounded-lg border-2 p-1 transition-all ${
              currentPage === pageNum
                ? "border-brand-500 bg-brand-50 shadow-sm dark:border-brand-400 dark:bg-brand-950"
                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
            }`}
          >
            <div className="flex aspect-[3/4] items-center justify-center rounded bg-white dark:bg-gray-700">
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                {pageNum}
              </span>
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
        ))}
      </div>
    </div>
  );
}
