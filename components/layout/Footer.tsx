"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  const toolLinks = [
    { label: t("tools.organize.mergePdf.title"), href: "/tools/merge-pdf" },
    { label: t("tools.organize.splitPdf.title"), href: "/tools/split-pdf" },
    { label: t("tools.optimize.compressPdf.title"), href: "/tools/compress-pdf" },
    { label: t("tools.convert.jpgToPdf.title"), href: "/tools/jpg-to-pdf" },
    { label: t("tools.edit.watermark.title"), href: "/tools/watermark" },
    { label: t("tools.security.protectPdf.title"), href: "/tools/protect-pdf" },
  ];

  const companyLinks = [
    { label: t("footer.about"), href: "/about" },
    { label: t("footer.pricing"), href: "/pricing" },
    { label: t("footer.blog"), href: "/blog" },
    { label: t("footer.contact"), href: "/contact" },
  ];

  const supportLinks = [
    { label: t("footer.help"), href: "/help" },
    { label: t("footer.privacy"), href: "/privacy" },
    { label: t("footer.terms"), href: "/terms" },
  ];

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="text-2xl font-bold text-brand-600">
              PDFCraft
            </Link>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {t("footer.description")}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-100">
              {t("footer.tools")}
            </h3>
            <ul className="mt-4 space-y-2">
              {toolLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-100">
              {t("footer.company")}
            </h3>
            <ul className="mt-4 space-y-2">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-100">
              {t("footer.support")}
            </h3>
            <ul className="mt-4 space-y-2">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 py-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
