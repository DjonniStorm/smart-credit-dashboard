import Link from "next/link";

import { BrandSign } from "@repo/ui/brand-sign";
import { BrandTooltip } from "@repo/ui/brand-tooltip";

import { ax } from "@/features/alfi-assistant";

import classes from "./arm-shell.module.css";

/** Знак банка «А» в наушниках Альфи, название и подпись АРМ. */
export function BrandMark() {
  return (
    <BrandTooltip label={ax.brand.story}>
      <Link
        href="/"
        className={classes.brand}
        aria-label="Кредитный конвейер, очередь заявок"
      >
        <span className={classes.brandSign} aria-hidden>
          <BrandSign size={30} />
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
