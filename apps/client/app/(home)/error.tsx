"use client";

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
        Повторить
      </button>
    </div>
  );
}
