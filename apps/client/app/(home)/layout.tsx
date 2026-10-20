import { type PropsWithChildren, Suspense } from "react";

import { CompanyCheckForm } from "@/features/company-check";

export default function HomeLayout({ children }: PropsWithChildren) {
  return (
    <main>
      <h1>Кабинет предпринимателя</h1>
      <p>Каркас. Сквозная ручка: client → api → mocks + scoring.</p>
      <Suspense>
        <CompanyCheckForm />
      </Suspense>
      {children}
    </main>
  );
}
