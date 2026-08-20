"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useEffect } from "react";

export default function PrivacyPage() {
  const { t } = useLanguage();

  useEffect(() => {
    document.title = `${t("footer.privacy")} - PDFCraft`;
  }, [t]);

  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("footer.privacy")}
        </h1>

        <div className="prose prose-gray dark:prose-invert mt-8 max-w-none space-y-6 text-gray-600 dark:text-gray-400">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Information We Collect</h2>
            <p>
              PDFCraft operates as a client-side PDF processing tool. We do not collect, store, or transmit your PDF files to any server for processing. All file operations occur locally in your browser.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">File Processing</h2>
            <p>
              Your files are processed entirely within your browser using WebAssembly and JavaScript. At no point are your files uploaded to our servers or any third-party servers. Once you close the page or navigate away, all processed files are permanently removed from your browser&apos;s memory.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Camera Access</h2>
            <p>
              The Scan to PDF feature requires access to your device camera. Camera access is used solely to capture images for PDF creation and is processed locally. No images or video feeds are transmitted externally.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Analytics</h2>
            <p>
              We may use privacy-respecting analytics to understand how our tools are used. These analytics do not track individual user behavior or file contents.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Cookies</h2>
            <p>
              We use minimal cookies only for essential functionality such as storing your language preference and theme settings. No tracking or advertising cookies are used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Third-Party Services</h2>
            <p>
              PDFCraft does not share your data with third-party services. Our hosting provider may collect standard server logs (IP addresses, browser type) for infrastructure purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Any changes will be posted on this page with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Contact</h2>
            <p>
              If you have questions about this privacy policy, please contact us through our contact page.
            </p>
          </section>

          <p className="text-sm text-gray-400 dark:text-gray-500">
            Last updated: August 2026
          </p>
        </div>
      </div>
    </div>
  );
}
