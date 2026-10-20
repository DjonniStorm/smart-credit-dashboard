"use client";

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
        Повторить
      </button>
    </div>
  );
}
