import { type PropsWithChildren } from "react";

import { ArmShell } from "@/widgets/app-shell";

export default function ArmLayout({ children }: PropsWithChildren) {
  return <ArmShell>{children}</ArmShell>;
}
