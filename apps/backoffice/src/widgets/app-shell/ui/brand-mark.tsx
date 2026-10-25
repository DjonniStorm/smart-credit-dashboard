import Link from "next/link";

import { BrandLockup } from "@repo/ui/brand-lockup";

import { ax } from "@/features/alfi-assistant";

/** Знак банка с названием и подписью «АРМ сотрудника банка». */
export function BrandMark() {
  return (
    <BrandLockup href="/" product={ax.brand.product} LinkComponent={Link} />
  );
}
