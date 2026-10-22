import { type ReactNode } from "react";

import classes from "./page.module.css";

/** Рабочая область страницы: поля, заголовок 28/34 и подзаголовок. */
export function Page({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className={classes.page}>
      <header className={classes.head}>
        <h1 className={classes.title}>{title}</h1>
        {subtitle && <p className={classes.subtitle}>{subtitle}</p>}
      </header>
      {children}
    </div>
  );
}
