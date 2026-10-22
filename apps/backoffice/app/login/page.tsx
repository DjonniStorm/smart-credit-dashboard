import type { Metadata } from "next";

import { SignInForm } from "@/features/sign-in";
import { BrandMark } from "@/widgets/app-shell";

import classes from "./login.module.css";

export const metadata: Metadata = { title: "Вход" };

export default function LoginPage() {
  return (
    <div className={classes.screen}>
      <header className={classes.header}>
        <BrandMark />
      </header>
      <main className={classes.main}>
        <SignInForm />
      </main>
    </div>
  );
}
