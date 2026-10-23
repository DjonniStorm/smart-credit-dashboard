"use client";

import { usePathname, useRouter } from "next/navigation";

import { AlfiDock, getAlfiGuidance } from "@repo/ui/alfi";

import { useApplications } from "@/entities/application";

import { armHint, loadErrorHint } from "../model/arm-hint";
import { ax } from "../model/text";

/** Альфи АРМ: всегда в углу, подсказывает следующую заявку и нужное действие. */
export function ArmAlfi({ employeeId }: { employeeId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const applications = useApplications();

  // Пока очередь грузится, подсказка о ней была бы выдумкой.
  if (applications.isPending) {
    return null;
  }
  const hint = applications.isError
    ? loadErrorHint(applications.error.message)
    : armHint(pathname, applications.data, employeeId, getAlfiGuidance);

  return (
    <AlfiDock
      hint={hint}
      labels={ax.dock}
      storageKey="arm:alfi-hidden"
      onNavigate={(href) => router.push(href)}
    />
  );
}
