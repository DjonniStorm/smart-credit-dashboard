"use client";

import { Button, Card, Group, Select, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { cabinetApi } from "@/shared/api/cabinet";
import { QueryError } from "@/shared/ui/query-state";
import { StateBlock } from "@repo/ui/state-block";

export function ClientReports() {
  const [status, setStatus] = useState<string | null>(null);
  const reports = useQuery({ queryKey: ["client-reports", status], queryFn: () => cabinetApi.listClientReports(status ? { status: [status as never] } : undefined) });
  const [selected, setSelected] = useState<string | null>(null);
  const detail = useQuery({ queryKey: ["client-report", selected], queryFn: () => cabinetApi.getClientReport(selected!), enabled: Boolean(selected) });
  if (reports.isPending) return <StateBlock kind="loading" title="Загружаем историю заявок" />;
  if (reports.isError) return <QueryError error={reports.error} onRetry={() => reports.refetch()} />;
  return <Stack gap="lg"><Group justify="space-between"><Title order={1}>История заявок</Title><Select aria-label="Статус" placeholder="Все статусы" clearable value={status} onChange={setStatus} data={["in_review", "needs_client", "approved", "funded", "rejected"].map((value) => ({ value, label: value }))} /></Group>{reports.data.items.length === 0 ? <StateBlock kind="empty" title="Заявок пока нет" /> : reports.data.items.map((item) => <Card key={item.id} withBorder><Group justify="space-between"><Stack gap={2}><Text fw={600}>{item.number}</Text><Text size="sm" c="dimmed">{item.productId} · {item.amount.toLocaleString("ru-RU")} ₽ · {item.status}</Text></Stack><Button disabled={detail.isPending} onClick={() => setSelected(item.id)}>Открыть историю</Button></Group>{selected === item.id && detail.isPending && <StateBlock kind="loading" title="Загружаем историю" />}{selected === item.id && detail.data && <Stack mt="md"><Text fw={600}>Timeline</Text>{detail.data.events.map((event) => <Text key={event.id} size="sm">{new Date(event.at).toLocaleString("ru-RU")} · {event.text}</Text>)}<Text fw={600}>Изменения</Text>{detail.data.changes.map((change) => <Text key={change.at}>{change.text}</Text>)}</Stack>}{selected === item.id && detail.isError && <QueryError error={detail.error} onRetry={() => detail.refetch()} />}</Card>)}</Stack>;
}
