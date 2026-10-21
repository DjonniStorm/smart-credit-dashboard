"use client";

import { useQuery } from "@tanstack/react-query";

import { cabinetApi } from "@/shared/api/cabinet";

export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: () => cabinetApi.getCatalog(),
    staleTime: 10 * 60_000,
  });
}
