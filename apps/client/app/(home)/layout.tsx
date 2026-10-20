import { type PropsWithChildren, Suspense } from "react";

import { Message, i18n, t } from "@repo/i18n";

import { CompanyCheckForm } from "@/features/company-check";

export default function HomeLayout({ children }: PropsWithChildren) {
  return (
    <main>
      <h1>{t(i18n.defaultLocale, Message.CabinetTitle)}</h1>
      <p>{t(i18n.defaultLocale, Message.CabinetLead)}</p>
      <Suspense>
        <CompanyCheckForm />
      </Suspense>
      {children}
    </main>
  );
}
