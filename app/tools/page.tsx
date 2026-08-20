"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import ToolCard from "@/components/tools/ToolCard";
import { TOOLS, TOOL_CATEGORIES } from "@/lib/tools";

export default function ToolsPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");

  const filtered = TOOLS.filter((tool) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = t(tool.nameKey).toLowerCase();
    const desc = t(tool.descriptionKey).toLowerCase();
    return name.includes(q) || desc.includes(q);
  });

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("nav.tools")}
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
            {t("hero.subtitle")}
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-md">
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.search")}
              className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
            />
          </div>
        </div>

        <div className="mt-12 space-y-12">
          {TOOL_CATEGORIES.map((category) => {
            const categoryTools = filtered.filter(
              (tool) => tool.category === category.id
            );
            if (categoryTools.length === 0) return null;

            return (
              <div key={category.id}>
                <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
                  {t(category.nameKey)}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {categoryTools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} />
                  ))}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {t("common.noResults")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
