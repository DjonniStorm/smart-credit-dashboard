"use client";

import { Badge, Button, Group, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import Link from "next/link";
import { useState } from "react";

import { StateBlock } from "@repo/ui/state-block";

import {
  type FinancingFilter,
  countApplications,
  matchesFilter,
  requiresAction,
  resolveFocus,
  useApplications,
  useFinancingSelection,
} from "@/entities/application";
import { useSession } from "@/entities/session";
import { fx } from "@/shared/i18n";
import { QueryError } from "@/shared/ui/query-state";

import { CompanySummary } from "./company-summary";
import classes from "./financing-dashboard.module.css";
import { FinancingList } from "./financing-list";
import { FocusCard } from "./focus-card";

export function FinancingDashboard() {
  const wide = useMediaQuery("(min-width: 75em)");
  const applications = useApplications();
  const account = useSession().data;
  const selection = useFinancingSelection();
  const [filter, setFilter] = useState<FinancingFilter>("all");
  if (!account) {
    return null;
  }
  if (applications.isPending) {
    return <StateBlock kind="loading" title={fx.loading} />;
  }
  if (applications.isError) {
    return (
      <QueryError
        error={applications.error}
        onRetry={() => {
          return applications.refetch();
        }}
      />
    );
  }
  const apps = applications.data;
  const focus = resolveFocus(apps, selection.draft, selection.selected);
  const focusedId = focus.kind === "application" ? focus.app.id : null;
  const others = apps.filter((app) => {
    return app.id !== focusedId && requiresAction(app);
  }).length;
  const counts = countApplications(apps);
  const rows = apps.filter((app) => {
    return matchesFilter(app, filter);
  });

  return (
    <Stack gap="lg" className={classes.dashboard}>
      <Group justify="space-between" align="flex-start" gap="md">
        <Stack gap={6}>
          <Title order={1}>{fx.title}</Title>
          <Text c="dimmed">{account.company.name}</Text>
          <Badge variant="light" color="gray" w="fit-content">
            {fx.demo}
          </Badge>
        </Stack>
        <Button component={Link} href="/products" variant="default">
          {fx.newApplication}
        </Button>
      </Group>
      <div className={classes.layout}>
        <div className={classes.focus}>
          <FocusCard
            focus={focus}
            manual={selection.selected !== null}
            onAuto={() => {
              selection.select(null);
            }}
            onRetry={() => {
              void applications.refetch();
            }}
          />
          {others > 0 && (
            <Button
              component="a"
              href="#financing-list"
              variant="subtle"
              mt="xs"
              onClick={() => {
                setFilter("action");
              }}
            >
              {fx.otherActions(others)}
            </Button>
          )}
        </div>
        {wide && (
          <div className={classes.company}>
            <CompanySummary account={account} />
          </div>
        )}
        <section
          className={classes.list}
          aria-labelledby="financing-list-title"
          id="financing-list"
        >
          <Group justify="space-between" mb="md">
            <Title id="financing-list-title" order={2}>
              {fx.list}
            </Title>
            <Button component={Link} href="/" variant="subtle">
              {fx.allApplications}
            </Button>
          </Group>
          <Group gap="xs" mb="md" role="group" aria-label={fx.list}>
            {(Object.keys(fx.filters) as FinancingFilter[]).map((key) => {
              return (
                <Button
                  key={key}
                  variant={key === filter ? "filled" : "default"}
                  color={key === filter ? "primary" : undefined}
                  aria-pressed={key === filter}
                  onClick={() => {
                    setFilter(key);
                  }}
                >
                  {fx.filters[key]} {counts[key]}
                </Button>
              );
            })}
          </Group>
          <FinancingList
            apps={rows}
            focusId={focusedId}
            onSelect={selection.select}
          />
          {rows.length === 0 && apps.length > 0 && (
            <StateBlock
              kind="empty"
              title={fx.emptyFilter}
              action={
                <Button
                  variant="default"
                  onClick={() => {
                    setFilter("all");
                  }}
                >
                  {fx.resetFilter}
                </Button>
              }
            />
          )}
          {selection.draft && (
            <div className={classes.draft}>
              <Text fw={600}>{fx.draft}</Text>
              <Button
                variant="default"
                onClick={() => {
                  selection.select("draft");
                }}
              >
                {fx.continueDraft}
              </Button>
            </div>
          )}
        </section>
        {!wide && (
          <div className={classes.company}>
            <CompanySummary account={account} />
          </div>
        )}
      </div>
    </Stack>
  );
}
