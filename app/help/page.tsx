"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useState } from "react";

const faqs = [
  {
    q: "How do I merge multiple PDF files?",
    a: "Go to the Merge PDF tool, upload your PDF files, arrange them in the desired order, and click the merge button. The merged PDF will be ready for download.",
  },
  {
    q: "Is my data safe when using PDFCraft?",
    a: "Yes. All files are encrypted during transfer and are automatically deleted from our servers after processing. We never access or share your documents.",
  },
  {
    q: "What file formats can I convert to PDF?",
    a: "PDFCraft supports converting JPG, PNG, and Word documents to PDF. We are working on adding more format support in the future.",
  },
  {
    q: "How do I compress a PDF file?",
    a: "Select the Compress PDF tool, upload your file, choose a compression quality level (low, medium, or high), and click compress. The smaller file will be available for download.",
  },
  {
    q: "Can I password-protect a PDF?",
    a: "Yes. Use the Protect PDF tool to add password protection to any PDF file. Simply upload the file and set your desired password.",
  },
  {
    q: "Is there a file size limit?",
    a: "Free users can upload files up to 10 MB. Pro users can upload files up to 100 MB. Enterprise users have no file size limit.",
  },
  {
    q: "Do I need to create an account?",
    a: "No account is required to use the basic PDF tools. However, creating an free account gives you access to job history and additional features.",
  },
  {
    q: "How do I extract specific pages from a PDF?",
    a: "Use the Extract Pages tool, upload your PDF, enter the page numbers or ranges you want to extract (e.g. 1-3, 5, 8), and click extract.",
  },
];

export default function HelpPage() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    document.title = `${t("nav.help")} - PDFCraft`;
  }, [t]);

  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("nav.help")}
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Frequently asked questions
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl divide-y divide-gray-200 dark:divide-gray-700">
          {faqs.map((faq, i) => (
            <div key={i} className="py-6">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-base font-semibold text-gray-900 dark:text-white">
                  {faq.q}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`ml-4 h-5 w-5 flex-shrink-0 text-gray-500 transition-transform dark:text-gray-400 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openIndex === i && (
                <p className="mt-3 text-gray-600 dark:text-gray-400">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
