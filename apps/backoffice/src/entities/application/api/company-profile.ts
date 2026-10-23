"use client";

import { useQuery } from "@tanstack/react-query";

import { armApi } from "@/shared/api/arm";

export const companyProfileKeys = {
  one: (inn: string) => ["company-profile", inn] as const,
};

export function useCompanyProfile(inn: string | undefined) {
  return useQuery({
    queryKey: companyProfileKeys.one(inn ?? ""),
    queryFn: () => armApi.getCompanyProfile(inn!),
    enabled: Boolean(inn),
    staleTime: 60_000,
  });
}
