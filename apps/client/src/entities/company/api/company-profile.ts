"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cabinetApi } from "@/shared/api/cabinet";

export const companyKeys = {
  profile: (inn: string) => ["company", "profile", inn] as const,
};

export function useCompanyProfile(inn: string | undefined) {
  return useQuery({
    queryKey: companyKeys.profile(inn ?? ""),
    queryFn: () => cabinetApi.getCompanyProfile(inn!),
    enabled: Boolean(inn),
    staleTime: 60_000,
  });
}

export function useGrantBkiConsent(inn: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cabinetApi.grantBkiConsent(inn),
    onSuccess: (profile) => {
      queryClient.setQueryData(companyKeys.profile(inn), profile);
    },
  });
}
