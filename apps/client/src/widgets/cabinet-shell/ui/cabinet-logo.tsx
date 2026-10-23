import Link from "next/link";

import { lx } from "@/shared/i18n";

import classes from "./cabinet-shell.module.css";

/** Знак и надпись банка. Файла логотипа у команды нет, знак собран из буквы. */
export function CabinetLogo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className={classes.logo}>
      <span className={classes.logoMark} aria-hidden>
        А
      </span>
      <span className={classes.logoBank}>{lx.bank}</span>
      <span className={classes.logoCabinet}>{lx.cabinet}</span>
    </Link>
  );
}
