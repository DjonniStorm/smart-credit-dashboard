"use client";

import { CompanyPassport } from "@repo/ui/company-passport";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";

export function CompanyProfileContext({
  profile,
}: {
  profile: CompanyProfileResponse;
}) {
  return (
    <CompanyPassport
      profile={profile}
      mode="backoffice"
      density="compact"
    />
  );
}
