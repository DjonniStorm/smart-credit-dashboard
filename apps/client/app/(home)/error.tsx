"use client";

import { Message, i18n, t } from "@repo/i18n";

import { CompanyCheckUnavailable } from "@/entities/company";

export default function HomeError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <CompanyCheckUnavailable />
      <button type="button" onClick={reset}>
        {t(i18n.defaultLocale, Message.Retry)}
      </button>
    </div>
  );
}
