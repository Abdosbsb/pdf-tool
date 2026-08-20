"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import Button from "@/components/ui/Button";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
        404
      </h1>
      <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">
        {t("common.notFound")}
      </p>
      <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-500">
        {t("common.notFoundDescription")}
      </p>
      <Link href="/" className="mt-8">
        <Button variant="primary" size="lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          {t("common.backToHome")}
        </Button>
      </Link>
    </div>
  );
}
