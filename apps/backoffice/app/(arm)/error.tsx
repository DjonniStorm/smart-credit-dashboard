"use client";

import { Message, i18n, t } from "@repo/i18n";

import { HealthStatusUnavailable } from "@/entities/health";

export default function ArmError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <HealthStatusUnavailable />
      <button type="button" onClick={reset}>
        {t(i18n.defaultLocale, Message.Retry)}
      </button>
    </div>
  );
}
