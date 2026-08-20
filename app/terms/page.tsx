"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useEffect } from "react";

export default function TermsPage() {
  const { t } = useLanguage();

  useEffect(() => {
    document.title = `${t("footer.terms")} - PDFCraft`;
  }, [t]);

  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("footer.terms")}
        </h1>

        <div className="prose prose-gray dark:prose-invert mt-8 max-w-none space-y-6 text-gray-600 dark:text-gray-400">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Acceptance of Terms</h2>
            <p>
              By accessing or using PDFCraft, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Description of Service</h2>
            <p>
              PDFCraft provides free, client-side PDF processing tools including merging, splitting, compressing, converting, and editing PDF files. All processing occurs in your browser.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Responsibilities</h2>
            <p>
              You are responsible for the content of files you process using PDFCraft. You must have the legal right to modify and process any files you upload. You agree not to use PDFCraft for any unlawful purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Intellectual Property</h2>
            <p>
              The PDFCraft application, including its code, design, and branding, is the intellectual property of its owners. You retain full ownership of any files you process using our tools.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Disclaimer of Warranties</h2>
            <p>
              PDFCraft is provided &quot;as is&quot; without warranties of any kind. We do not guarantee that our services will be uninterrupted, error-free, or completely secure. You use our services at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Limitation of Liability</h2>
            <p>
              In no event shall PDFCraft be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Service Availability</h2>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of PDFCraft at any time without prior notice. We shall not be liable for any modification, suspension, or discontinuation of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Changes to Terms</h2>
            <p>
              We may revise these Terms of Service at any time. By continuing to use PDFCraft after any changes, you accept the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Contact</h2>
            <p>
              If you have any questions about these terms, please contact us through our contact page.
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
