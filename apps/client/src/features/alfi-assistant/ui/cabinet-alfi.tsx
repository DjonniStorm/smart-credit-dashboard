"use client";

import { usePathname, useRouter } from "next/navigation";

import { AlfiDock } from "@repo/ui/alfi";

import { useApplications } from "@/entities/application";
import { ax } from "@/shared/i18n";

import { cabinetHint } from "../model/cabinet-hint";

/** Альфи кабинета: всегда в углу, подсказка зависит от страницы и заявок. */
export function CabinetAlfi() {
  const pathname = usePathname();
  const router = useRouter();
  const applications = useApplications();

  return (
    <AlfiDock
      hint={cabinetHint(pathname, applications.data ?? [])}
      labels={ax.dock}
      storageKey="cabinet:alfi-hidden"
      onNavigate={(href) => router.push(href)}
    />
  );
}
