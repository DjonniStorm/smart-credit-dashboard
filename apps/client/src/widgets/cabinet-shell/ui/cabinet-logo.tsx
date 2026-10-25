import Link from "next/link";

import { BrandSign } from "@repo/ui/brand-sign";
import { BrandTooltip } from "@repo/ui/brand-tooltip";

import { ax, lx } from "@/shared/i18n";

import classes from "./cabinet-shell.module.css";

/** Знак и надпись банка: «А» в наушниках Альфи. */
export function CabinetLogo({ href = "/" }: { href?: string }) {
  return (
    <BrandTooltip label={ax.brand.story}>
      <Link href={href} className={classes.logo}>
        <span className={classes.logoMark} aria-hidden>
          <BrandSign />
        </span>
        <span className={classes.logoBank}>{ax.brand.name}</span>
        <span className={classes.logoCabinet}>{lx.cabinet}</span>
      </Link>
    </BrandTooltip>
  );
}
