"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { armApi } from "@/shared/api/arm";

import { clearSession, useSessionEmployeeId } from "./session";

/**
 * Сотрудник текущей сессии api. Если выбранная учётка осталась в браузере,
 * а cookie сессии пропала, возвращаем на вход.
 */
export function useCurrentEmployee() {
  const id = useSessionEmployeeId();
  const session = useQuery({
    queryKey: ["arm", "session", id],
    queryFn: () => armApi.currentEmployee(),
    enabled: typeof id === "string",
    staleTime: Infinity,
  });
  const expired = session.isSuccess && session.data === null;

  useEffect(() => {
    if (expired) {
      clearSession();
    }
  }, [expired]);

  return {
    id: expired ? null : id,
    employee: session.data ?? null,
    isLoading:
      id === undefined || (typeof id === "string" && session.isPending),
    error: session.error,
    retry: () => void session.refetch(),
  };
}
