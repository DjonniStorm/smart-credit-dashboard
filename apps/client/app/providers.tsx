"use client";

import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { NavigationProgress } from "@mantine/nprogress";
import { QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren } from "react";
import { getQueryClient } from "../lib/query-client";

export function Providers({ children }: PropsWithChildren) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider defaultColorScheme="light">
        <Notifications />
        <NavigationProgress />
        <ModalsProvider>{children}</ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
