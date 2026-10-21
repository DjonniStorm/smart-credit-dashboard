"use client";

import {
  Alert,
  Button,
  Group,
  List,
  Paper,
  PinInput,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Application } from "@repo/contracts/cabinet";
import { formatRub } from "@repo/ui/money";
import { StateBlock } from "@repo/ui/state-block";

import { useRequestSignCode, useSign } from "@/entities/application";
import { tx } from "@/shared/i18n";
import { InlineError } from "@/shared/ui/query-state";

const t = tx.sign;

/** Подписание договора кодом подтверждения. Код показывается на экране. */
export function SignContract({ app }: { app: Application }) {
  const router = useRouter();
  const requestCode = useRequestSignCode(app.id);
  const sign = useSign(app.id);
  const [code, setCode] = useState("");

  if (app.deal?.stage !== "signing") {
    return (
      <StateBlock
        kind="empty"
        title={t.notReadyTitle}
        action={
          <Button component={Link} href={`/applications/${app.id}`}>
            {t.toApplication}
          </Button>
        }
      >
        {t.notReadyText}
      </StateBlock>
    );
  }

  const terms = app.deal.terms;
  const facts = [
    [tx.application.offer.amount, formatRub(terms.amount)],
    [tx.application.offer.term, tx.common.months(terms.termMonths)],
    [tx.application.offer.rate, tx.common.ratePerYear(terms.ratePercent)],
    [tx.application.offer.payment, formatRub(terms.monthlyPayment)],
    [tx.application.disbursed.account, app.deal.account],
  ];

  function submit() {
    sign.mutate(code, {
      onSuccess: () => router.push(`/applications/${app.id}`),
    });
  }

  return (
    <Stack gap="lg">
      <Paper withBorder radius="lg" p="lg">
        <Stack gap="md">
          <Title order={2} size="h3">
            {t.terms}
          </Title>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} component="dl" m={0}>
            {facts.map(([label, value]) => (
              <div key={label}>
                <Text component="dt" size="sm" c="dimmed">
                  {label}
                </Text>
                <Text
                  component="dd"
                  m={0}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {value}
                </Text>
              </div>
            ))}
          </SimpleGrid>
          <Title order={3} size="h4" mt="sm">
            {t.documents}
          </Title>
          <List spacing={4}>
            {t.docs.map((d) => (
              <List.Item key={d}>{d}</List.Item>
            ))}
          </List>
        </Stack>
      </Paper>

      <Paper withBorder radius="lg" p="lg">
        <Stack gap="md" align="flex-start">
          {!requestCode.data ? (
            <Button
              onClick={() => requestCode.mutate()}
              loading={requestCode.isPending}
            >
              {t.getCode}
            </Button>
          ) : (
            <>
              <Alert title={t.codeSent} w="100%" color="gray">
                {t.demoCode(requestCode.data.demoCode)}
              </Alert>
              <Stack gap={6}>
                <Text component="label" htmlFor="sign-code" fw={500}>
                  {t.codeLabel}
                </Text>
                <PinInput
                  id="sign-code"
                  length={6}
                  type="number"
                  oneTimeCode
                  value={code}
                  onChange={setCode}
                  onComplete={setCode}
                  error={sign.isError}
                  aria-label={t.codeLabel}
                />
              </Stack>
              {sign.isError && <InlineError>{sign.error.message}</InlineError>}
              <Group gap="sm">
                <Button
                  onClick={submit}
                  loading={sign.isPending}
                  disabled={code.length !== 6}
                >
                  {t.sign}
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => {
                    setCode("");
                    sign.reset();
                    requestCode.mutate();
                  }}
                  loading={requestCode.isPending}
                >
                  {t.newCode}
                </Button>
              </Group>
            </>
          )}
          {requestCode.isError && (
            <InlineError>{requestCode.error.message}</InlineError>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
