import { Center } from "@mantine/core";
import type { Metadata } from "next";

import { SignInForm } from "@/features/sign-in";

export const metadata: Metadata = { title: "Вход" };

export default function LoginPage() {
  return (
    <Center mih="100dvh" p="md">
      <SignInForm />
    </Center>
  );
}
