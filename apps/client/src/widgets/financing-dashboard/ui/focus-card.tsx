import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";

import { ApplicationStatusBadge } from "@repo/ui/application-status";
import { formatRub } from "@repo/ui/money";
import { StageRail } from "@repo/ui/stage-rail";

import {
  type Focus,
  focusAction,
  stageOf,
  stages,
} from "@/entities/application";
import { useCatalog } from "@/entities/product";
import { fx } from "@/shared/i18n";

import classes from "./financing-dashboard.module.css";

export function FocusCard({
  focus,
  manual,
  onAuto,
  onRetry,
}: {
  focus: Focus;
  manual: boolean;
  onAuto: () => void;
  onRetry: () => void;
}) {
  const catalog = useCatalog();
  const action = focusAction(focus);
  const app = focus.kind === "application" ? focus.app : null;
  const stage = app ? stageOf(app) : null;
  const primary = ["request", "sign", "offer", "draft", "empty"].includes(
    action.kind,
  );
  const product = catalog.data?.products.find((item) => {
    return item.id === app?.productId;
  });
  return (
    <Card component="section" aria-labelledby="financing-focus-title" h="100%">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Text c="dimmed" size="sm">
            {fx.next}
          </Text>
          {app && <ApplicationStatusBadge status={app.status} />}
        </Group>
        <Title
          id="financing-focus-title"
          order={2}
          className={classes.focusTitle}
        >
          {action.title}
        </Title>
        <Text>{action.description}</Text>
        {action.why && (
          <Text c="dimmed" size="sm">
            {action.why}
          </Text>
        )}
        <Group gap="sm">
          {action.href && (
            <Button
              component={Link}
              href={action.href}
              variant={primary ? "filled" : "default"}
            >
              {action.label}
            </Button>
          )}
          {action.kind === "invalid" && (
            <Button variant="default" onClick={onRetry}>
              {fx.retry}
            </Button>
          )}
          {manual && (
            <Button variant="subtle" onClick={onAuto}>
              {fx.autoFocus}
            </Button>
          )}
        </Group>
        {app && stage && (
          <Stack gap="md" className={classes.path}>
            <Text fw={600}>
              {app.number} · {product?.name ?? fx.unknownProduct}
            </Text>
            <Text c="dimmed" size="sm">
              {fx.requested} {formatRub(app.amount)} ·{" "}
              {fx.months(app.termMonths)}
            </Text>
            {action.kind === "offer" && app.decision?.offer && (
              <Text size="sm">
                {fx.offered}: {formatRub(app.decision.offer.amount)} ·{" "}
                {fx.months(app.decision.offer.termMonths)}
              </Text>
            )}
            <StageRail
              stages={stages}
              current={stage.current}
              waitingForClient={stage.waitingForClient}
            />
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
