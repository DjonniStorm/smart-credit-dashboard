import { Message, i18n, t } from "@repo/i18n";
import type { CompanyCheckDto } from "@repo/sdk";
import { Card } from "@repo/ui/card";

export function CompanyCheckCard({ check }: { check: CompanyCheckDto }) {
  return (
    <Card
      title={t(i18n.defaultLocale, Message.CheckResultTitleInn, {
        inn: check.inn,
      })}
    >
      <pre>{JSON.stringify(check, null, 2)}</pre>
    </Card>
  );
}
