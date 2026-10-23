import { Locale } from "./locale.ts";

export const i18n = {
  defaultLocale: Locale.Ru,
  locales: [Locale.Ru, Locale.En],
} as const;

export const openGraphLocale: Record<Locale, string> = {
  [Locale.Ru]: "ru_RU",
  [Locale.En]: "en_US",
};
