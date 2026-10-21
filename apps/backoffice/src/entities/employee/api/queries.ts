"use client";

import { useQuery } from "@tanstack/react-query";

import { armApi, armKeys } from "@/shared/api/arm";

export function useEmployees() {
  return useQuery({
    queryKey: armKeys.employees(),
    queryFn: () => armApi.listEmployees(),
    staleTime: Infinity,
  });
}
