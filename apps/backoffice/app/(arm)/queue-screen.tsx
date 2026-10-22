"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { queueGroupOrder } from "@/entities/application";
import type { QueueTab } from "@/features/queue-filters";
import { ApplicationPanel } from "@/widgets/application-panel";
import { QueueBoard } from "@/widgets/queue-board";

import classes from "./queue-screen.module.css";

const isTab = (v: string | null): v is QueueTab =>
  v === "all" || queueGroupOrder.includes(v as never);

/** Очередь слева, панель заявки справа. Вкладка и открытая заявка живут в адресе. */
export function QueueScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = params.get("tab");
  const tab: QueueTab = isTab(tabParam) ? tabParam : "all";
  const openId = params.get("open");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const close = useCallback(() => {
    update({ open: null });
    returnFocus.current?.focus();
  }, [update]);

  // Escape закрывает панель, когда фокус не в диалоге или меню.
  useEffect(() => {
    if (!openId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const t = e.target as HTMLElement;
      if (t.closest("[role=dialog], [role=menu], [role=listbox]")) return;
      close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, close]);

  // Поверх таблицы (узкий экран) панель забирает фокус, рядом с таблицей нет.
  useEffect(() => {
    if (openId && window.matchMedia("(max-width: 74.99em)").matches) {
      titleRef.current?.focus();
    }
  }, [openId]);

  return (
    <div className={classes.screen} data-panel={openId ? "open" : undefined}>
      <div className={classes.main}>
        <QueueBoard
          tab={tab}
          onTabChange={(t) => update({ tab: t === "all" ? null : t })}
          openId={openId}
          onOpen={(id) => {
            returnFocus.current = document.activeElement as HTMLElement | null;
            update({ open: id });
          }}
        />
      </div>
      {openId && (
        <aside className={classes.aside} aria-label="Панель заявки">
          <ApplicationPanel id={openId} onClose={close} titleRef={titleRef} />
        </aside>
      )}
    </div>
  );
}
