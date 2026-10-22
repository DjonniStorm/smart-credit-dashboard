import type { Metadata } from "next";

import { Page } from "@/shared/ui/page";
import { JournalTable } from "@/widgets/journal";

export const metadata: Metadata = { title: "Журнал" };

export default function JournalPage() {
  return (
    <Page
      title="Журнал"
      subtitle="Все изменения заявок: действия сотрудников, конвейера и клиентов"
    >
      <JournalTable />
    </Page>
  );
}
