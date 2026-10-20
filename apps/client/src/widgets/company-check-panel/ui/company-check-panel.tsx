import { CompanyCheckCard } from "@/entities/company";
import { getCompanyCheck } from "@/entities/company/api/get-company-check";

export async function CompanyCheckPanel({ inn }: { inn: string }) {
  const check = await getCompanyCheck(inn);
  return <CompanyCheckCard check={check} />;
}
