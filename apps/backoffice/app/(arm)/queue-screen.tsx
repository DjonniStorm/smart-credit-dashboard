"use client";

import { useLocalStorage } from "@mantine/hooks";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";

import { queueGroupOrder } from "@/entities/application";
import type { QueueTab } from "@/features/queue-filters";
import { ApplicationPanel } from "@/widgets/application-panel";
import { QueueBoard } from "@/widgets/queue-board";

import classes from "./queue-screen.module.css";

const isTab = (v: string | null): v is QueueTab =>
  v === "all" || queueGroupOrder.includes(v as never);

/** Ширина панели заявки: ограничения и ключ для сохранения в localStorage. */
const PANEL_WIDTH_KEY = "arm-panel-width";
const PANEL_HIDDEN_KEY = "arm-panel-hidden";
const MIN_PANEL_WIDTH = 320;
const MAX_PANEL_WIDTH = 900;
const DEFAULT_PANEL_WIDTH = 360;
const RESIZE_STEP = 20;

const clampPanelWidth = (width: number) =>
  Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, width));

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
  const [storedWidth, setStoredWidth] = useLocalStorage<number>({
    key: PANEL_WIDTH_KEY,
    defaultValue: DEFAULT_PANEL_WIDTH,
    deserialize: (value) => {
      const parsed = value === undefined ? NaN : Number(value);
      return Number.isFinite(parsed) ? parsed : DEFAULT_PANEL_WIDTH;
    },
  });
  const panelWidth = clampPanelWidth(storedWidth);
  const changePanelWidth = useCallback(
    (width: number) => setStoredWidth(clampPanelWidth(width)),
    [setStoredWidth],
  );
  const [panelHidden, setPanelHidden] = useLocalStorage({
    key: PANEL_HIDDEN_KEY,
    defaultValue: false,
  });

  // Альфи (dock в packages/ui) читает --panel-width с body: он стоит у границы
  // панели и не заходит на неё. На .screen переменная тоже остаётся для панели.
  useEffect(() => {
    const root = document.body;
    root.style.setProperty("--panel-width", `${panelWidth}px`);
    return () => {
      root.style.removeProperty("--panel-width");
    };
  }, [panelWidth]);

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
    // Панель открыли по ссылке (колокольчик, поиск, обзор): фокус на её строку.
    const back =
      returnFocus.current ??
      document.querySelector<HTMLElement>(`[data-app-id="${openId}"]`);
    back?.focus();
    returnFocus.current = null;
  }, [update, openId]);

  // Escape закрывает панель, когда фокус не в диалоге или меню.
  useEffect(() => {
    if (!openId) return;
    // Открытый выпадающий список фильтра закрывается сам, панель не трогаем.
    // Mantine успевает снять aria-expanded до слушателя на window, поэтому
    // состояние списка запоминаем в фазе перехвата, до обработчиков React.
    let listWasOpen = false;
    function onKeyCapture(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement;
      listWasOpen = Boolean(t.closest("[aria-expanded=true]"));
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || e.defaultPrevented || listWasOpen) return;
      const t = e.target as HTMLElement;
      if (t.closest("[role=dialog], [role=menu], [role=listbox]")) return;
      close();
    }
    window.addEventListener("keydown", onKeyCapture, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKeyCapture, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [openId, close]);

  // Поверх таблицы (узкий экран) панель забирает фокус, рядом с таблицей нет.
  useEffect(() => {
    if (openId && window.matchMedia("(max-width: 74.99em)").matches) {
      titleRef.current?.focus();
    }
  }, [openId]);

  // Ctrl+Alt+B сворачивает и разворачивает панель; в полях ввода нет.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        !(e.ctrlKey || e.metaKey) ||
        !e.altKey ||
        e.key.toLowerCase() !== "b"
      ) {
        return;
      }
      const target = e.target as HTMLElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      setPanelHidden((hidden) => !hidden);
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [setPanelHidden]);

  return (
    <div
      className={classes.screen}
      data-panel={openId ? "open" : undefined}
      style={{ "--panel-width": `${panelWidth}px` } as CSSProperties}
    >
      <div className={classes.main}>
        <QueueBoard
          tab={tab}
          onTabChange={(t) => update({ tab: t === "all" ? null : t })}
          openId={openId}
          onOpen={(id) => {
            returnFocus.current = document.activeElement as HTMLElement | null;
            setPanelHidden(false);
            update({ open: id });
          }}
        />
      </div>
      {openId && !panelHidden && (
        <>
          <PanelResizer width={panelWidth} onChange={changePanelWidth} />
          <aside
            className={classes.aside}
            aria-label="Панель заявки"
            data-alfi-avoid="right"
          >
            <ApplicationPanel
              key={openId}
              id={openId}
              onClose={close}
              titleRef={titleRef}
            />
          </aside>
        </>
      )}
    </div>
  );
}

/**
 * Вертикальный разделитель между очередью и панелью заявки.
 * Мышь или стрелки меняют ширину панели, значение сохраняется в localStorage.
 */
function PanelResizer({
  width,
  onChange,
}: {
  width: number;
  onChange: (width: number) => void;
}) {
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const move = (ev: PointerEvent) => {
      onChange(startWidth + (startX - ev.clientX));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(width - RESIZE_STEP);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onChange(width + RESIZE_STEP);
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Изменить ширину панели заявки"
      aria-valuemin={MIN_PANEL_WIDTH}
      aria-valuemax={MAX_PANEL_WIDTH}
      aria-valuenow={width}
      tabIndex={0}
      className={classes.resizer}
      style={{ right: `${width}px` }}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  );
}
