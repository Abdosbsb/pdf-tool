"use client";

import { useLanguage } from "@/context/LanguageContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

const plans = [
  {
    key: "free",
    popular: false,
  },
  {
    key: "pro",
    popular: true,
  },
  {
    key: "enterprise",
    popular: false,
  },
] as const;

export default function PricingPage() {
  const { t } = useLanguage();

  return (
    <div className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("pricing.title")}
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
            {t("pricing.subtitle")}
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-3">
          {plans.map(({ key, popular }) => {
            const name = t(`pricing.${key}.name`);
            const price = t(`pricing.${key}.price`);
            const period = t(`pricing.${key}.period`);
            const features = t(`pricing.${key}.features`);
            const cta = t(`pricing.${key}.cta`);
            const featureList: string[] =
              typeof features === "string"
                ? features.split(",").map((f: string) => f.trim())
                : Array.isArray(features)
                  ? (features as unknown as string[])
                  : [];

            return (
              <Card
                key={key}
                className={`relative flex flex-col p-8 ${
                  popular
                    ? "border-2 border-brand-500 dark:border-brand-400 lg:scale-105 lg:shadow-xl"
                    : ""
                }`}
              >
                {popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 text-xs font-semibold text-white">
                    {t("pricing.popular")}
                  </span>
                )}

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {name}
                </h3>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {price}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    / {period}
                  </span>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {featureList.map((feature: string) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  {popular ? (
                    <Link href="/tools" className="block">
                      <Button variant="primary" size="lg" className="w-full">
                        {cta}
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/tools" className="block">
                      <Button variant="secondary" size="lg" className="w-full">
                        {cta}
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
