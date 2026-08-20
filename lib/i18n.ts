import en from "@/locales/en.json";
import ar from "@/locales/ar.json";

export type Locale = "en" | "ar";

const messages: Record<Locale, Record<string, unknown>> = { en, ar };

export function getMessages(locale: Locale): Record<string, unknown> {
  return messages[locale] || messages.en;
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function t(locale: Locale, key: string, fallback?: string): string {
  const keys = key.split(".");
  let value: unknown = messages[locale] || messages.en;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      value = undefined;
      break;
    }
  }

  if (typeof value === "string") return value;

  if (fallback !== undefined) return fallback;

  let enValue: unknown = messages.en;
  for (const k of keys) {
    if (enValue && typeof enValue === "object" && k in enValue) {
      enValue = (enValue as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  return typeof enValue === "string" ? enValue : key;
}

export function getLocaleFromPath(pathname: string): Locale {
  if (pathname.startsWith("/ar")) return "ar";
  return "en";
}

export function getPathWithLocale(pathname: string, locale: Locale): string {
  const clean = pathname.replace(/^\/(ar|en)/, "") || "/";
  if (locale === "ar") return `/ar${clean}`;
  return clean;
}
