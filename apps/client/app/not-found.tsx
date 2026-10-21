"use client";

import { Button, Container, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";

import { tx } from "@/shared/i18n";

export default function NotFound() {
  return (
    <Container size="sm" py={64}>
      <Stack gap="sm" align="flex-start">
        <Title order={1}>{tx.notFound.title}</Title>
        <Text>{tx.notFound.text}</Text>
        <Button component={Link} href="/">
          {tx.common.toApplications}
        </Button>
      </Stack>
    </Container>
  );
}
