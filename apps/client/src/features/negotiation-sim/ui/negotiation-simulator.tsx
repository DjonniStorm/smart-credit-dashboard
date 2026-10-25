import {
  Button,
  Chip,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";

import type { Application, ProductCatalog } from "@repo/contracts/cabinet";
import {
  type NegotiationOption,
  type NegotiationPriority,
  negotiationPriorities,
  suggestNegotiationOptions,
} from "@repo/contracts/negotiation";
import { StateBlock } from "@repo/ui/state-block";

import { tx } from "@/shared/i18n";

import { NegotiationOptionCard } from "./negotiation-option-card";
import classes from "./negotiation-simulator.module.css";

const t = tx.negotiation;

interface Baseline {
  terms: SandboxTerms;
  payment: number;
}

export interface SandboxTerms {
  productId: string;
  amount: number;
  termMonths: number;
}

function sameTerms(a: SandboxTerms, b: SandboxTerms) {
  return (
    a.productId === b.productId &&
    a.amount === b.amount &&
    a.termMonths === b.termMonths
  );
}

/**
 * Симулятор переговоров: по приоритету клиента предлагает до трёх вариантов
 * условий. Ничего не отправляет, вариант только подставляется в песочницу.
 */
export function NegotiationSimulator({
  app,
  catalog,
  current,
  currentPayment,
  onApply,
}: {
  app: Application;
  catalog: ProductCatalog;
  current: SandboxTerms;
  currentPayment: number;
  onApply: (option: NegotiationOption) => void;
}) {
  const [priority, setPriority] = useState<NegotiationPriority | null>(null);
  const [base, setBase] = useState<Baseline>({
    terms: current,
    payment: currentPayment,
  });
  const options = priority
    ? suggestNegotiationOptions({
        priority,
        purpose: app.purpose,
        current: base.terms,
        products: catalog.products,
        keyRate: catalog.keyRate,
        financials: app.financials,
      })
    : [];

  return (
    <Stack gap="sm" component="section" aria-labelledby="negotiation-title">
      <div>
        <Title order={3} size="h4" id="negotiation-title">
          {t.title}
        </Title>
        <Text size="sm" c="dimmed">
          {t.lead}
        </Text>
      </div>
      <Chip.Group
        multiple={false}
        value={priority}
        onChange={(value) => {
          setPriority(value as NegotiationPriority);
          setBase({ terms: current, payment: currentPayment });
        }}
      >
        <div
          className={classes.priorities}
          role="group"
          aria-label={t.priorityLabel}
        >
          {negotiationPriorities.map((item) => (
            <Chip
              key={item}
              value={item}
              variant="outline"
              classNames={{ label: classes.chip }}
            >
              {t.priorities[item].label}
            </Chip>
          ))}
        </div>
      </Chip.Group>
      {priority && (
        <Text size="sm" c="dimmed">
          {t.priorities[priority].hint}
        </Text>
      )}
      {priority && options.length === 0 && (
        <StateBlock kind="empty" title={t.emptyTitle}>
          {t.emptyText}
        </StateBlock>
      )}
      {options.length > 0 && (
        <>
          <Group justify="space-between" gap="xs">
            <Text fw={600}>{t.optionsTitle(options.length)}</Text>
            {!sameTerms(base.terms, current) && (
              <Button
                variant="subtle"
                size="compact-sm"
                onClick={() =>
                  setBase({ terms: current, payment: currentPayment })
                }
              >
                {t.recalculate}
              </Button>
            )}
          </Group>
          <SimpleGrid
            component="ul"
            cols={{ base: 1, md: options.length }}
            spacing="sm"
            className={classes.list}
          >
            {options.map((option) => {
              const product = catalog.products.find(
                (item) => item.id === option.productId,
              );
              if (!product) {
                return null;
              }
              return (
                <NegotiationOptionCard
                  key={`${option.productId}-${option.amount}-${option.termMonths}`}
                  option={option}
                  product={product}
                  currentPayment={base.payment}
                  applied={
                    current.productId === option.productId &&
                    current.amount === option.amount &&
                    current.termMonths === option.termMonths
                  }
                  onApply={() => onApply(option)}
                />
              );
            })}
          </SimpleGrid>
        </>
      )}
    </Stack>
  );
}
