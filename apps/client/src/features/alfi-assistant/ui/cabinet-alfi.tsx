"use client";

import { usePathname, useRouter } from "next/navigation";

import { AlfiDock } from "@repo/ui/alfi";

import {
  focusAction,
  resolveFocus,
  useApplications,
  useFinancingSelection,
} from "@/entities/application";
import { ax } from "@/shared/i18n";

import { cabinetHint, loadErrorHint } from "../model/cabinet-hint";

/** Альфи кабинета: всегда в углу, подсказка зависит от страницы и заявок. */
export function CabinetAlfi() {
  const pathname = usePathname();
  const router = useRouter();
  const applications = useApplications();
  const selection = useFinancingSelection();

  // Пока заявки грузятся, подсказка о них была бы выдумкой.
  if (applications.isPending) {
    return null;
  }
  const step = focusAction(
    resolveFocus(applications.data ?? [], selection.draft, selection.selected),
  );
  const hint = applications.isError
    ? loadErrorHint(applications.error.message)
    : pathname === "/home"
      ? {
          state: "explain" as const,
          title: step.title,
          message: step.description,
          action:
            step.href && step.label
              ? { label: step.label, href: step.href }
              : undefined,
        }
      : cabinetHint(pathname, applications.data);

  return (
    <AlfiDock
      hint={hint}
      labels={ax.dock}
      storageKey="cabinet:alfi-hidden"
      onNavigate={(href) => router.push(href)}
    />
  );
}
