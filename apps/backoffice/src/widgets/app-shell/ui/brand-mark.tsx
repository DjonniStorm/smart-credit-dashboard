import Link from "next/link";

import { BrandTooltip } from "@repo/ui/brand-tooltip";

import { ax } from "@/features/alfi-assistant";

import classes from "./arm-shell.module.css";

/**
 * Знак банка набран текстом: файла логотипа у команды пока нет.
 * Когда он появится, заменить на ассет, подпись кабинета оставить.
 */
export function BrandMark() {
  return (
    <BrandTooltip label={ax.brand.story}>
      <Link
        href="/"
        className={classes.brand}
        aria-label="Кредитный конвейер, очередь заявок"
      >
        <span className={classes.brandSign} aria-hidden>
          А
        </span>
        <span className={classes.brandName} aria-hidden>
          {ax.brand.name}
        </span>
        <span className={classes.brandProduct} aria-hidden>
          Кредитный конвейер
        </span>
      </Link>
    </BrandTooltip>
  );
}
