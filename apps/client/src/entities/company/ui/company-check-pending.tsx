import { Message, i18n, t } from "@repo/i18n";
import { Card } from "@repo/ui/card";
import { StatusBadge } from "@repo/ui/status-badge";

export function CompanyCheckPending() {
  return (
    <Card title={t(i18n.defaultLocale, Message.CheckResultHeading)}>
      <StatusBadge ok label={t(i18n.defaultLocale, Message.Loading)} />
    </Card>
  );
}
