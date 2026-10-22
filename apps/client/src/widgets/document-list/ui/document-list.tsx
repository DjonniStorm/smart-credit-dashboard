"use client";

import { Anchor, Button, Card, Stack, Table, Text, Title } from "@mantine/core";
import Link from "next/link";

import type { AttachedDocument } from "@repo/contracts/cabinet";
import { StateBlock } from "@repo/ui/state-block";

import { useApplications } from "@/entities/application";
import { formatDate, lx, tx } from "@/shared/i18n";
import { QueryError } from "@/shared/ui/query-state";

const t = lx.documents;

type Row = AttachedDocument & { appId: string; appNumber: string };

/** Документы из заявок и из ответов на вопросы банка, новые сверху. */
export function DocumentList() {
  const apps = useApplications();

  let content;
  if (apps.isPending) {
    content = <StateBlock kind="loading" title={tx.home.loading} />;
  } else if (apps.isError) {
    content = <QueryError error={apps.error} onRetry={() => apps.refetch()} />;
  } else {
    const rows: Row[] = apps.data
      .flatMap((a) =>
        [
          ...a.documents,
          ...a.requests.flatMap((r) => r.answer?.documents ?? []),
        ].map((d) => ({ ...d, appId: a.id, appNumber: a.number })),
      )
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt));

    content =
      rows.length === 0 ? (
        <StateBlock
          kind="empty"
          title={t.empty}
          action={
            <Button component={Link} href="/applications/new" variant="default">
              {tx.home.newApplication}
            </Button>
          }
        >
          {t.emptyText}
        </StateBlock>
      ) : (
        <Card padding={0}>
          <Table.ScrollContainer minWidth={560}>
            <Table verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t.name}</Table.Th>
                  <Table.Th>{t.kind}</Table.Th>
                  <Table.Th>{t.application}</Table.Th>
                  <Table.Th>{t.added}</Table.Th>
                  <Table.Th ta="end">{t.size}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((d) => (
                  <Table.Tr key={`${d.appId}-${d.id}`}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {d.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{lx.wizard.kinds[d.kind]}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Anchor
                        component={Link}
                        href={`/applications/${d.appId}`}
                        size="sm"
                      >
                        {d.appNumber}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatDate(d.addedAt)}</Text>
                    </Table.Td>
                    <Table.Td
                      ta="end"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      <Text size="sm">
                        {Math.max(1, Math.round(d.sizeBytes / 1024))} КБ
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      );
  }

  return (
    <Stack gap="lg">
      <Stack gap={6}>
        <Title order={1}>{t.title}</Title>
        <Text c="dimmed" maw={640}>
          {t.lead}
        </Text>
      </Stack>
      {content}
    </Stack>
  );
}
