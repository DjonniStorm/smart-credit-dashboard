import type { CompanyCheckDto } from "@repo/sdk";
import { Card } from "@repo/ui/card";

export function CompanyCheckCard({ check }: { check: CompanyCheckDto }) {
  return (
    <Card title={`Результат для ИНН ${check.inn}`}>
      <pre>{JSON.stringify(check, null, 2)}</pre>
    </Card>
  );
}
