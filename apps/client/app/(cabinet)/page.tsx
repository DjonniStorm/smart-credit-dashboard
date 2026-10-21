import type { Metadata } from "next";

import { tx } from "@/shared/i18n";
import { ApplicationList } from "@/widgets/application-list";

export const metadata: Metadata = { title: tx.home.title };

export default function HomePage() {
  return <ApplicationList />;
}
