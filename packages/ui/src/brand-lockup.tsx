import { type ElementType, type JSX, type ReactNode } from "react";

import { alfiText, i18n } from "@repo/i18n";

import classes from "./brand-lockup.module.css";
import { BrandSign } from "./brand-sign";
import { BrandTooltip } from "./brand-tooltip";

export type BrandLockupLink = ElementType<{
  href: string;
  className?: string;
  children: ReactNode;
}>;

export type BrandLockupProps = {
  href?: string;
  /** Подпись продукта: «Кабинет предпринимателя», «АРМ сотрудника банка». */
  product?: string;
  /** Ссылка приложения: в Next это next/link, по умолчанию обычный <a>. */
  LinkComponent?: BrandLockupLink;
};

const brand = alfiText(i18n.defaultLocale).brand;

/**
 * Единый знак банка для шапок клиента и АРМ: знак, название банка
 * и необязательная подпись продукта.
 */
export function BrandLockup({
  href = "/",
  product,
  LinkComponent: Link = "a",
}: BrandLockupProps): JSX.Element {
  return (
    <BrandTooltip label={brand.story}>
      <Link href={href} className={classes.root}>
        <span className={classes.mark} aria-hidden>
          <BrandSign />
        </span>
        <span className={classes.name}>{brand.name}</span>
        {product ? <span className={classes.product}>{product}</span> : null}
      </Link>
    </BrandTooltip>
  );
}
