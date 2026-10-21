"use client";

import { useEmployees } from "../api/queries";
import { useSessionEmployeeId } from "./session";

export function useCurrentEmployee() {
  const id = useSessionEmployeeId();
  const employees = useEmployees();
  const employee = employees.data?.find((e) => e.id === id) ?? null;
  return {
    id,
    employee,
    isLoading: id === undefined || employees.isPending,
    error: employees.error,
    retry: () => void employees.refetch(),
  };
}
