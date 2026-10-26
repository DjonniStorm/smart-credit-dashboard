import type { Metadata } from "next";

import { tx } from "@/shared/i18n";
import { CabinetProfile } from "@/widgets/cabinet-profile";

export const metadata: Metadata = {
  title: tx.profile.title,
  robots: { index: false },
};

export default function ProfilePage() {
  return <CabinetProfile />;
}
