import { type PropsWithChildren } from "react";

import { Message, i18n, t } from "@repo/i18n";

export default function ArmLayout({ children }: PropsWithChildren) {
  return (
    <main>
      <h1>{t(i18n.defaultLocale, Message.ArmTitle)}</h1>
      <p>{t(i18n.defaultLocale, Message.ArmLead)}</p>
      {children}
    </main>
  );
}
