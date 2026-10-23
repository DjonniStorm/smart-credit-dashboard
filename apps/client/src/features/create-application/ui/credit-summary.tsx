import {
  Anchor,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconPencil } from "@tabler/icons-react";

import type { CreditProduct, CreditPurpose } from "@repo/contracts/cabinet";
import { formatRub } from "@repo/ui/money";

import { lx, tx } from "@/shared/i18n";

import classes from "./application-wizard.module.css";

const t = lx.summary;

/** Сводка «Параметры кредита» справа от формы. Всё из черновика, без догадок. */
export function CreditSummary({
  purpose,
  product,
  amount,
  termMonths,
  preview,
  onEdit,
}: {
  purpose: CreditPurpose;
  product: CreditProduct | undefined;
  amount: number | null;
  termMonths: number | null;
  preview: { payment: number; rate: number } | null;
  onEdit: () => void;
}) {
  return (
    <Card
      component="aside"
      aria-labelledby="credit-summary"
      className={classes.summary}
    >
      <Group justify="space-between" gap="xs" mb="md">
        <Title order={2} size="h3" id="credit-summary">
          {t.title}
        </Title>
        <Anchor
          component="button"
          type="button"
          onClick={onEdit}
          className={classes.editLink}
        >
          <IconPencil size={14} stroke={1.5} aria-hidden />
          {t.edit}
        </Anchor>
      </Group>

      {!product ? (
        <Stack gap={4}>
          <Text fw={600}>{t.noProduct}</Text>
          <Text size="sm" c="dimmed">
            {t.noProductText}
          </Text>
        </Stack>
      ) : (
        <Stack gap="md">
          <div>
            <Text fw={600}>{product.name}</Text>
            <Text size="sm" c="dimmed">
              {tx.purposes[purpose].label}
            </Text>
          </div>
          <div className={classes.summaryNumbers}>
            <div>
              <Text size="sm" c="dimmed">
                {t.amount}
              </Text>
              <Text className={classes.bigValue}>
                {amount ? formatRub(amount) : "—"}
              </Text>
              <Text size="xs" c="dimmed" className={classes.range}>
                {t.range(
                  formatRub(product.minAmount),
                  formatRub(product.maxAmount),
                )}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                {t.term}
              </Text>
              <Text className={classes.bigValue}>
                {termMonths ? tx.common.months(termMonths) : "—"}
              </Text>
              <Text size="xs" c="dimmed" className={classes.range}>
                {t.termRange(product.minTermMonths, product.maxTermMonths)}
              </Text>
            </div>
          </div>
        </Stack>
      )}

      <Divider my="md" color="var(--kk-line)" />

      <Text size="sm" c="dimmed">
        {t.payment}
      </Text>
      <Text className={classes.midValue} aria-live="polite">
        {preview ? formatRub(preview.payment) : "—"}
      </Text>
      <Text size="xs" c="dimmed">
        {preview
          ? `${t.rate(tx.common.ratePerYear(preview.rate))}. ${t.paymentNote}`
          : t.paymentNote}
      </Text>

      <div className={classes.offerNote}>
        <IconAlertCircle size={16} stroke={1.5} aria-hidden />
        <Text size="xs">{t.offerNote}</Text>
      </div>
    </Card>
  );
}
