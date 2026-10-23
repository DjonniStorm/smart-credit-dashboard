import type { Metadata } from "next";

import { Page } from "@/shared/ui/page";
import { ProductRules } from "@/widgets/product-rules";

export const metadata: Metadata = { title: "Справочники" };

export default function ProductsPage() {
  return (
    <Page
      title="Справочники"
      subtitle="Продукты и правила: по ним система готовит рекомендацию, решение принимает сотрудник"
    >
      <ProductRules />
    </Page>
  );
}
