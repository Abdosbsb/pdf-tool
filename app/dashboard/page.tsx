"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import type { Job, ApiResponse } from "@/types";

const statusStyles: Record<string, string> = {
  COMPLETED:
    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400",
  PROCESSING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400",
  PENDING:
    "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-400",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400",
  EXPIRED:
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function DashboardPage() {
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/jobs");
      const data: ApiResponse<Job[]> = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setJobs(data.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch {
      // silently fail
    }
  };

  const statusLabel = (status: string) => {
    const key = `dashboard.${status.toLowerCase()}`;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  return (
    <div className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("dashboard.title")}
        </h1>

        <div className="mt-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("dashboard.recentJobs")}
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner />
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-gray-900">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                {t("dashboard.noJobs")}
              </p>
              <Link href="/tools" className="mt-6 inline-block">
                <Button variant="primary" size="md">
                  {t("hero.cta")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                    <tr>
                      <th className="whitespace-nowrap px-6 py-3 font-medium text-gray-700 dark:text-gray-300">
                        {t("dashboard.tool")}
                      </th>
                      <th className="whitespace-nowrap px-6 py-3 font-medium text-gray-700 dark:text-gray-300">
                        {t("dashboard.status")}
                      </th>
                      <th className="whitespace-nowrap px-6 py-3 font-medium text-gray-700 dark:text-gray-300">
                        {t("dashboard.date")}
                      </th>
                      <th className="whitespace-nowrap px-6 py-3 font-medium text-gray-700 dark:text-gray-300">
                        {t("dashboard.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {jobs.map((job) => (
                      <tr
                        key={job.id}
                        className="bg-white transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/50"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-gray-900 dark:text-white">
                          {job.tool}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[job.status] || ""}`}
                          >
                            {statusLabel(job.status)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-gray-600 dark:text-gray-400">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2">
                            {job.status === "COMPLETED" && job.outputFile && (
                              <a href={`/api/files/${job.outputFile}`}>
                                <Button variant="ghost" size="sm">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="mr-1 h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                                    />
                                  </svg>
                                  {t("dashboard.download")}
                                </Button>
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              onClick={() => handleDelete(job.id)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="mr-1 h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                />
                              </svg>
                              {t("dashboard.delete")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
