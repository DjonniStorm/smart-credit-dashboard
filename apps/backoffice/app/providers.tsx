"use client";

import { DatesProvider } from "@mantine/dates";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { NavigationProgress } from "@mantine/nprogress";
import { QueryClientProvider } from "@tanstack/react-query";
import "dayjs/locale/ru";
import { type PropsWithChildren } from "react";

import { UiProvider } from "@repo/ui/provider";

import { getQueryClient } from "@/shared/api";

export function Providers({ children }: PropsWithChildren) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <UiProvider density="compact">
        {/* 440px по умолчанию шире телефона и растягивает вьюпорт. */}
        <Notifications containerWidth="min(440px, calc(100vw - 32px))" />
        <NavigationProgress />
        <DatesProvider settings={{ locale: "ru", firstDayOfWeek: 1 }}>
          <ModalsProvider>{children}</ModalsProvider>
        </DatesProvider>
      </UiProvider>
    </QueryClientProvider>
  );
}
