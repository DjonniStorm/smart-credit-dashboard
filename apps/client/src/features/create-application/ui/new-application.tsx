"use client";

import { useSearchParams } from "next/navigation";

import { useSession } from "@/entities/session";

import { ApplicationWizard } from "./application-wizard";

/** Мастер получает учётку из сессии: каркас кабинета уже проверил вход. */
export function NewApplication() {
  const account = useSession().data;
  // Черновик собирается из адреса один раз. Новый продукт из поиска (Ctrl+K)
  // меняет только query, поэтому мастер пересоздаём по его параметрам.
  const key = useSearchParams().toString();
  return account ? <ApplicationWizard key={key} account={account} /> : null;
}
