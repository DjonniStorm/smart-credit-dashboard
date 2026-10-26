import Link from "next/link";

import { BrandLockup } from "@repo/ui/brand-lockup";

import { lx } from "@/shared/i18n";

/** Знак и надпись банка: «А» в наушниках Альфи. */
export function CabinetLogo({ href = "/" }: { href?: string }) {
  return <BrandLockup href={href} product={lx.cabinet} LinkComponent={Link} />;
}
