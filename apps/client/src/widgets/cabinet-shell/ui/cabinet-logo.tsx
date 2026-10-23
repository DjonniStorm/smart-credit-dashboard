import Link from "next/link";

import { BrandTooltip } from "@repo/ui/brand-tooltip";

import { ax, lx } from "@/shared/i18n";

import classes from "./cabinet-shell.module.css";

/** Знак и надпись банка. Файла логотипа у команды нет, знак собран из буквы. */
export function CabinetLogo({ href = "/" }: { href?: string }) {
  return (
    <BrandTooltip label={ax.brand.story}>
      <Link href={href} className={classes.logo}>
        <span className={classes.logoMark} aria-hidden>
          А
        </span>
        <span className={classes.logoBank}>{ax.brand.name}</span>
        <span className={classes.logoCabinet}>{lx.cabinet}</span>
      </Link>
    </BrandTooltip>
  );
}
