import { type PropsWithChildren } from "react";

export default function ArmLayout({ children }: PropsWithChildren) {
  return (
    <main>
      <h1>АРМ сотрудника банка</h1>
      <p>Каркас. Здесь будет очередь заявок и карточка решения.</p>
      {children}
    </main>
  );
}
