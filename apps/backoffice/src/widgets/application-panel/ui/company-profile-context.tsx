"use client";

import { CompanyPassport } from "@repo/ui/company-passport";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";

export function CompanyProfileContext({
  profile,
  onRetrySource,
  retryingSource,
}: {
  profile: CompanyProfileResponse;
  onRetrySource?: (source: Exclude<CompanyProfileResponse["sources"][number]["source"], "bank_turnover">) => void;
  retryingSource?: Exclude<CompanyProfileResponse["sources"][number]["source"], "bank_turnover"> | null;
}) {
  return (
    <CompanyPassport
      profile={profile}
      mode="backoffice"
      density="compact"
      onRetrySource={onRetrySource}
      retryingSource={retryingSource}
    />
  );
}
