import { Stack, Text, Title } from "@mantine/core";

import type { Application, CreditProduct } from "@repo/contracts/cabinet";
import { formatRub } from "@repo/ui/money";

import { tx } from "@/shared/i18n";

const s = tx.wizard.summary;

/** Параметры заявки, как их видел банк. */
export function ApplicationFacts({
  app,
  product,
}: {
  app: Application;
  product: CreditProduct | undefined;
}) {
  const rows = [
    { label: s.product, value: product?.name ?? app.productId },
    { label: s.purpose, value: tx.purposes[app.purpose].label },
    { label: s.amount, value: formatRub(app.amount) },
    { label: s.term, value: tx.common.months(app.termMonths) },
    { label: s.company, value: app.company.name },
    ...(app.comment ? [{ label: s.comment, value: app.comment }] : []),
  ];
  return (
    <section aria-labelledby="facts-title">
      <Title order={3} id="facts-title" mb="sm">
        {tx.application.params}
      </Title>
      <Stack component="dl" gap="xs" m={0}>
        {rows.map((r) => (
          <div key={r.label}>
            <Text component="dt" size="sm" c="dimmed">
              {r.label}
            </Text>
            <Text
              component="dd"
              m={0}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {r.value}
            </Text>
          </div>
        ))}
      </Stack>
    </section>
  );
}
