import { Card as MantineCard, Stack, Title } from "@mantine/core";
import { type JSX, type ReactNode } from "react";

export function Card({
  className,
  title,
  children,
}: {
  className?: string;
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <MantineCard component="section" className={className}>
      <Stack gap="sm">
        <Title order={3}>{title}</Title>
        <div>{children}</div>
      </Stack>
    </MantineCard>
  );
}
