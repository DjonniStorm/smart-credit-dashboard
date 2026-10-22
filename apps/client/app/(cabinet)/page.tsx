import type { Metadata } from "next";

import { lx } from "@/shared/i18n";
import { ApplicationList } from "@/widgets/application-list";

export const metadata: Metadata = { title: lx.applications.title };

export default function HomePage() {
  return <ApplicationList />;
}
