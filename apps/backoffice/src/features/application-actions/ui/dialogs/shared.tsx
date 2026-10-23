"use client";

import { Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

import type { Application } from "@repo/contracts/application";

export interface DialogProps {
  opened: boolean;
  app: Application;
  pending: boolean;
  error: Error | null;
  onClose: () => void;
}

export function ErrorLine({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <Alert
      color="danger"
      variant="light"
      icon={<IconAlertCircle size={18} aria-hidden />}
      role="alert"
    >
      {error.message}
    </Alert>
  );
}
