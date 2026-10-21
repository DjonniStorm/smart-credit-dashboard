"use client";

import { type ReactNode, createContext, use } from "react";

import type { Employee } from "@repo/contracts/application";

const SignedInContext = createContext<Employee | null>(null);

/** Сотрудник, под которым вошли. Кладёт оболочка АРМ после проверки входа. */
export function SignedInProvider({
  employee,
  children,
}: {
  employee: Employee;
  children: ReactNode;
}) {
  return <SignedInContext value={employee}>{children}</SignedInContext>;
}

export function useSignedInEmployee(): Employee {
  const employee = use(SignedInContext);
  if (!employee) {
    throw new Error("useSignedInEmployee вне оболочки АРМ");
  }
  return employee;
}
