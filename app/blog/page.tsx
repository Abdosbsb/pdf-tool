"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useEffect } from "react";

export default function BlogPage() {
  const { t } = useLanguage();

  useEffect(() => {
    document.title = `${t("nav.blog")} - PDFCraft`;
  }, [t]);

  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("nav.blog")}
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            PDFCraft
          </p>
        </div>

        <div className="mt-16 rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Coming Soon
          </h2>
          <p className="mt-3 max-w-md mx-auto text-gray-600 dark:text-gray-400">
            Our blog is under development. Stay tuned for tips, tutorials, and
            updates about working with PDF files.
          </p>
        </div>
      </div>
    </div>
  );
}
