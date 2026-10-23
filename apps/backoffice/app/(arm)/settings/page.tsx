import type { Metadata } from "next";

import { Page } from "@/shared/ui/page";
import { Settings } from "@/widgets/settings";

export const metadata: Metadata = { title: "Настройки" };

export default function SettingsPage() {
  return (
    <Page title="Настройки">
      <Settings />
    </Page>
  );
}
