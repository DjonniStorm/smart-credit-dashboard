"use client";

import { usePathname, useRouter } from "next/navigation";

import { AlfiDock } from "@repo/ui/alfi-dock";

import { useApplications } from "@/entities/application";

import { armHint } from "../model/arm-hint";

/** Альфи АРМ: всегда в углу, подсказывает следующую заявку и нужное действие. */
export function ArmAlfi({ employeeId }: { employeeId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const applications = useApplications();

  return (
    <AlfiDock
      hint={armHint(pathname, applications.data ?? [], employeeId)}
      storageKey="arm:alfi-hidden"
      onNavigate={(href) => router.push(href)}
    />
  );
}
