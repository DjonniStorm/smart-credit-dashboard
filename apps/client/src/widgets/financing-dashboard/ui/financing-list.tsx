import { Badge, Button, Text, UnstyledButton } from "@mantine/core";
import Link from "next/link";

import type { Application } from "@repo/contracts/cabinet";
import { ApplicationStatusBadge } from "@repo/ui/application-status";
import { formatRub } from "@repo/ui/money";

import { applicationAction } from "@/entities/application";
import { useCatalog } from "@/entities/product";
import { fx } from "@/shared/i18n";

import classes from "./financing-dashboard.module.css";

export function FinancingList({
  apps,
  focusId,
  onSelect,
}: {
  apps: Application[];
  focusId: string | null;
  onSelect: (id: string) => void;
}) {
  const catalog = useCatalog();
  return (
    <ul className={classes.rows}>
      {apps.map((app) => {
        const selected = app.id === focusId;
        const product = catalog.data?.products.find((item) => {
          return item.id === app.productId;
        });
        return (
          <li key={app.id} className={classes.row}>
            <UnstyledButton
              className={classes.choose}
              aria-label={fx.choose(app.number)}
              aria-pressed={selected}
              onClick={() => {
                onSelect(app.id);
              }}
            >
              <Text fw={600}>{app.number}</Text>
              <Text size="sm" c="dimmed">
                {product?.name ?? fx.unknownProduct}
              </Text>
              {selected && (
                <Badge variant="light" color="primary" mt={6}>
                  {fx.inFocus}
                </Badge>
              )}
            </UnstyledButton>
            <div className={classes.amount}>
              <Text size="xs" c="dimmed">
                {fx.requested}
              </Text>
              <Text fw={600}>{formatRub(app.amount)}</Text>
            </div>
            <div className={classes.status}>
              <ApplicationStatusBadge status={app.status} />
              <Text size="sm" c="dimmed" mt={6}>
                {applicationAction(app).title}
              </Text>
            </div>
            <Button
              component={Link}
              href={"/applications/" + app.id}
              variant="default"
              className={classes.open}
            >
              {fx.open}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
