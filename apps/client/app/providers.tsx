"use client";

import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { NavigationProgress } from "@mantine/nprogress";
import { QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren } from "react";

import { UiProvider } from "@repo/ui/provider";

import { getQueryClient } from "@/shared/api";

export function Providers({ children }: PropsWithChildren) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <UiProvider>
        <Notifications position="top-right" />
        <NavigationProgress />
        <ModalsProvider>{children}</ModalsProvider>
      </UiProvider>
    </QueryClientProvider>
  );
}
