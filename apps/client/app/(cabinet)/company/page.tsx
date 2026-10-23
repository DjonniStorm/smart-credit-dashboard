import type { Metadata } from "next";

import { lx } from "@/shared/i18n";
import { CompanyProfile } from "@/widgets/company-profile";

export const metadata: Metadata = {
  title: lx.company.title,
  robots: { index: false },
};

export default function CompanyPage() {
  return <CompanyProfile />;
}
