import type { Metadata } from "next";
import { Suspense } from "react";

import { QueueScreen } from "./queue-screen";

export const metadata: Metadata = { title: "Очередь заявок" };

export default function QueuePage() {
  return (
    <Suspense>
      <QueueScreen />
    </Suspense>
  );
}
