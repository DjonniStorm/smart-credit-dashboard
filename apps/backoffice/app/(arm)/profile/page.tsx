import type { Metadata } from "next";

import { backofficeText, i18n } from "@repo/i18n";

import { Page } from "@/shared/ui/page";
import { Profile } from "@/widgets/profile";

export const metadata: Metadata = {
  title: backofficeText(i18n.defaultLocale).profile.title,
};

export default function ProfilePage() {
  return (
    <Page title={backofficeText(i18n.defaultLocale).profile.title}>
      <Profile />
    </Page>
  );
}
