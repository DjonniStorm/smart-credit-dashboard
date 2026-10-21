"use client";

import { useSession } from "@/entities/session";

import { ApplicationWizard } from "./application-wizard";

/** Мастер получает учётку из сессии: каркас кабинета уже проверил вход. */
export function NewApplication() {
  const account = useSession().data;
  return account ? <ApplicationWizard account={account} /> : null;
}
