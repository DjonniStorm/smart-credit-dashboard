"use client";

import { Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ApplicationCard } from "@repo/ui/application-card";
import { ApplicationStatusBadge } from "@repo/ui/application-status";
import { Marker } from "@repo/ui/marker";
import { formatRub } from "@repo/ui/money";
import { StateBlock } from "@repo/ui/state-block";

import {
  type ApplicationDraft,
  clearDraft,
  loadDraft,
  needsClient,
  nextStepOf,
  stageOf,
  stages,
  useApplications,
} from "@/entities/application";
import { useCatalog } from "@/entities/product";
import { useSession } from "@/entities/session";
import { formatDate, tx } from "@/shared/i18n";
import { QueryError } from "@/shared/ui/query-state";

const t = tx.home;

/** Главная: заявки клиента, сверху та, где ход за ним. */
export function ApplicationList() {
  const apps = useApplications();
  const catalog = useCatalog();
  const account = useSession().data;
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);

  useEffect(() => {
    const d = loadDraft();
    // Черновик читается только в браузере, после гидрации.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(d && d.accountId === account?.id ? d : null);
  }, [account?.id]);

  const productName = (id: string) =>
    catalog.data?.products.find((p) => p.id === id)?.name ?? "";

  let content;
  if (apps.isPending) {
    content = <StateBlock kind="loading" title={t.loading} />;
  } else if (apps.isError) {
    content = <QueryError error={apps.error} onRetry={() => apps.refetch()} />;
  } else if (apps.data.length === 0 && !draft) {
    content = (
      <StateBlock
        kind="empty"
        title={t.emptyTitle}
        action={
          <Button component={Link} href="/products">
            {t.emptyAction}
          </Button>
        }
      >
        {t.emptyText}
      </StateBlock>
    );
  } else {
    // Красная кнопка одна: у заявки, где ход за клиентом, иначе у черновика.
    const primaryId =
      apps.data.find(needsClient)?.id ?? (draft ? "draft" : null);
    const sorted = [...apps.data].sort(
      (a, b) => Number(needsClient(b)) - Number(needsClient(a)),
    );
    content = (
      <Stack gap="lg">
        {draft && (
          <Paper withBorder radius="lg" p="lg">
            <Group justify="space-between" gap="md" align="center">
              <Stack gap={4}>
                <Group gap="sm">
                  <Title order={3}>{t.draftTitle}</Title>
                  <ApplicationStatusBadge status="draft" />
                </Group>
                <Text size="sm" c="dimmed">
                  {productName(draft.productId)}
                  {draft.amount
                    ? `, ${formatRub(Number(draft.amount))}`
                    : ""}. {t.draftText(tx.wizard.steps[draft.step] ?? "")}
                </Text>
              </Stack>
              <Group gap="sm">
                <Button
                  variant="subtle"
                  onClick={() => {
                    clearDraft();
                    setDraft(null);
                  }}
                >
                  {t.draftDiscard}
                </Button>
                <Button
                  component={Link}
                  href="/applications/new?draft=1"
                  variant={primaryId === "draft" ? "filled" : "default"}
                >
                  {t.draftContinue}
                </Button>
              </Group>
            </Group>
          </Paper>
        )}
        {sorted.map((app) => {
          const stage = stageOf(app);
          return (
            <ApplicationCard
              key={app.id}
              product={productName(app.productId)}
              number={app.number}
              createdAt={formatDate(app.createdAt)}
              amount={app.deal?.terms.amount ?? app.amount}
              termMonths={app.deal?.terms.termMonths ?? app.termMonths}
              purpose={tx.purposes[app.purpose].label}
              status={app.status}
              stages={stages}
              current={stage.current}
              nextStep={nextStepOf(app)}
              action={
                <Button
                  component={Link}
                  href={`/applications/${app.id}`}
                  variant={app.id === primaryId ? "filled" : "default"}
                >
                  {tx.common.open}
                </Button>
              }
            />
          );
        })}
      </Stack>
    );
  }

  const waiting = apps.data?.find(needsClient);

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-end" gap="md">
        <Stack gap={6}>
          <Title order={1}>{t.title}</Title>
          {waiting && (
            <Text>
              <Marker>{t.needsYou(waiting.number)}</Marker>
            </Text>
          )}
        </Stack>
        <Button component={Link} href="/products" variant="default">
          {t.newApplication}
        </Button>
      </Group>
      {content}
    </Stack>
  );
}
