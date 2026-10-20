"use client";

import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { NavigationProgress } from "@mantine/nprogress";
import { type PropsWithChildren } from "react";

export function Providers({ children }: PropsWithChildren) {
  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications />
      <NavigationProgress />
      <ModalsProvider>{children}</ModalsProvider>
    </MantineProvider>
  );
}
