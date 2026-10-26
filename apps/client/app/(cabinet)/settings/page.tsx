import type { Metadata } from "next";

import { tx } from "@/shared/i18n";
import { CabinetSettings } from "@/widgets/cabinet-settings";

export const metadata: Metadata = {
  title: tx.settings.title,
  robots: { index: false },
};

export default function SettingsPage() {
  return <CabinetSettings />;
}
