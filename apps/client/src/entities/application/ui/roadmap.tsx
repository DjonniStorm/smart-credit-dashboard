"use client";

import { Accordion, Badge, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  IconCircle,
  IconCircleCheck,
  IconCircleFilled,
} from "@tabler/icons-react";

import type { Application } from "@repo/contracts/cabinet";

import { lx, tx } from "@/shared/i18n";

import { type RoadmapStep, buildRoadmap } from "../model/roadmap";

/** Метка состояния шага: пройден, сейчас, впереди. */
function StepMark({ state }: { state: RoadmapStep["state"] }) {
  if (state === "done") {
    return (
      <ThemeIcon variant="light" color="green" size={24} radius="xl">
        <IconCircleCheck size={14} />
      </ThemeIcon>
    );
  }
  if (state === "current") {
    return (
      <ThemeIcon variant="filled" color="primary" size={24} radius="xl">
        <IconCircleFilled size={12} />
      </ThemeIcon>
    );
  }
  return (
    <IconCircle size={18} style={{ color: "var(--mantine-color-text)" }} />
  );
}

/** Дорожная карта заявки: шаги, кто действует, что блокирует и ветки. */
export function Roadmap({ app }: { app: Application }) {
  const map = buildRoadmap(app);
  const currentKey = map.steps.find((step) => step.state === "current")?.key;

  if (app.status === "draft") return null;

  return (
    <Accordion mt="md" variant="separated" defaultValue={currentKey}>
      {map.steps.map((step) => (
        <Accordion.Item key={step.key} value={step.key}>
          <Accordion.Control>
            <Group wrap="nowrap" gap="sm">
              <StepMark state={step.state} />
              <Text
                size="sm"
                fw={
                  step.state === "current"
                    ? 600
                    : step.state === "done"
                      ? 500
                      : 400
                }
              >
                {step.title}
              </Text>
              {step.state === "current" && (
                <Badge ml="auto" variant="light" color="primary">
                  {lx.detail.stageState.current}
                </Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <Text size="sm">{step.explanation}</Text>
              <Group gap={6}>
                <Text size="sm" fw={600}>
                  {tx.roadmap.whoActs}
                </Text>
                <Text size="sm">{tx.application.actors[step.actor]}</Text>
              </Group>
              {step.blocker && (
                <Group gap={6}>
                  <Text size="sm" fw={600}>
                    {tx.roadmap.whyBlocked}
                  </Text>
                  <Text size="sm">{step.blocker}</Text>
                </Group>
              )}
              {step.clientAction && (
                <Group gap={6}>
                  <Text size="sm" fw={600}>
                    {tx.roadmap.yourAction}
                  </Text>
                  <Text size="sm">{step.clientAction}</Text>
                </Group>
              )}
              {step.state === "current" && map.branches.length > 0 && (
                <>
                  <Text size="sm" fw={600} mt={4}>
                    {tx.roadmap.branchesTitle}
                  </Text>
                  <Group gap={6}>
                    {map.branches.map((branch) => (
                      <Badge key={branch} variant="light" color="gray">
                        {branch}
                      </Badge>
                    ))}
                  </Group>
                </>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
