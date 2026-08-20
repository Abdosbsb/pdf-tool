"use client";

import { useLanguage } from "@/context/LanguageContext";
import Card from "@/components/ui/Card";

const values = [
  {
    key: "fast",
    color: "brand",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </svg>
    ),
    colorClasses: {
      bg: "bg-brand-100 dark:bg-brand-900",
      text: "text-brand-600 dark:text-brand-400",
    },
  },
  {
    key: "secure",
    color: "green",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
    colorClasses: {
      bg: "bg-green-100 dark:bg-green-900",
      text: "text-green-600 dark:text-green-400",
    },
  },
  {
    key: "easyToUse",
    color: "purple",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59"
        />
      </svg>
    ),
    colorClasses: {
      bg: "bg-purple-100 dark:bg-purple-900",
      text: "text-purple-600 dark:text-purple-400",
    },
  },
];

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("about.title")}
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            {t("about.description")}
          </p>
        </div>

        <Card className="mx-auto mt-12 max-w-3xl p-8 sm:p-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("about.mission")}
          </h2>
          <p className="mt-4 leading-relaxed text-gray-600 dark:text-gray-400">
            {t("about.missionText")}
          </p>
        </Card>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t("about.values")}
          </h2>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-8 sm:grid-cols-3">
          {values.map(({ key, icon, colorClasses }) => (
            <div
              key={key}
              className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800"
            >
              <div
                className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${colorClasses.bg} ${colorClasses.text}`}
              >
                {icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t(`about.${key}`)}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t(`about.${key}Description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
