import {
  IconAlertCircle,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconLoader2,
} from "@tabler/icons-react";

import type { ApplicationStatus } from "@repo/contracts";
import type { CheckState, WaitingOn } from "@repo/contracts/application";
import { ToneBadge } from "@repo/ui/tone-badge";

import {
  checkStateLabel,
  checkStateTone,
  statusLabel,
  statusTone,
  waitingLabel,
} from "../model/labels";

const statusIcon = {
  success: IconCircleCheck,
  danger: IconCircleX,
  neutral: IconClock,
  action: IconAlertCircle,
};

export function StatusTag({ status }: { status: ApplicationStatus }) {
  const tone = statusTone[status];
  return (
    <ToneBadge tone={tone} icon={statusIcon[tone]}>
      {statusLabel[status]}
    </ToneBadge>
  );
}

const waitingTone = {
  employee: "action",
  client: "neutral",
  system: "neutral",
  nobody: "success",
} as const;

const waitingIcon = {
  employee: IconAlertCircle,
  client: IconClock,
  system: IconLoader2,
  nobody: IconCircleCheck,
};

export function WaitingTag({ waitingOn }: { waitingOn: WaitingOn }) {
  return (
    <ToneBadge tone={waitingTone[waitingOn]} icon={waitingIcon[waitingOn]}>
      {waitingLabel[waitingOn]}
    </ToneBadge>
  );
}

const checkIcon = {
  pending: IconLoader2,
  passed: IconCircleCheck,
  warning: IconAlertCircle,
  failed: IconCircleX,
  unavailable: IconCircleX,
};

export function CheckTag({ state }: { state: CheckState }) {
  return (
    <ToneBadge tone={checkStateTone[state]} icon={checkIcon[state]}>
      {checkStateLabel[state]}
    </ToneBadge>
  );
}
