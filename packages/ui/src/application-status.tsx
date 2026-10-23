"use client";

import {
  IconAlertCircle,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconPencil,
  type Icon as TablerIcon,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { type JSX } from "react";

import type { ApplicationStatus } from "@repo/contracts";

import { t } from "./motion";
import { type Tone, ToneBadge } from "./tone-badge";

/** Подписи статусов для клиента: что происходит, а не имя внутреннего этапа. */
export const applicationStatus: Record<
  ApplicationStatus,
  { label: string; tone: Tone; icon: TablerIcon }
> = {
  draft: { label: "Черновик", tone: "neutral", icon: IconPencil },
  in_review: { label: "Банк рассматривает", tone: "neutral", icon: IconClock },
  needs_client: {
    label: "Нужно от вас",
    tone: "action",
    icon: IconAlertCircle,
  },
  counter_offer: {
    label: "Другие условия",
    tone: "action",
    icon: IconAlertCircle,
  },
  approved: { label: "Одобрено", tone: "success", icon: IconCircleCheck },
  disbursed: {
    label: "Деньги на счёте",
    tone: "success",
    icon: IconCircleCheck,
  },
  rejected: { label: "Отказ", tone: "danger", icon: IconCircleX },
  blocked: { label: "На ручной проверке", tone: "danger", icon: IconAlertCircle },
};

/** Бейдж статуса заявки. Смена статуса анимируется на месте. */
export function ApplicationStatusBadge({
  status,
}: {
  status: ApplicationStatus;
}): JSX.Element {
  const { label, tone, icon } = applicationStatus[status];
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={status}
        style={{ display: "inline-flex" }}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4, transition: t.exit }}
      >
        <ToneBadge tone={tone} icon={icon}>
          {label}
        </ToneBadge>
      </motion.span>
    </AnimatePresence>
  );
}
