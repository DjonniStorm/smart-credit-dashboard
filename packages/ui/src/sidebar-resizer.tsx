"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
} from "react";

import classes from "./sidebar-resizer.module.css";

/**
 * Вертикальный разделитель левого сайдбара: мышь/тач и стрелки меняют
 * ширину. Скрывается на мобильном, где меню уходит в оверлей.
 * Дельта считается от центра разделителя в момент нажатия, а pointer capture
 * держит события на разделителе, пока кнопка зажата.
 */
export function SidebarResizer({
  width,
  min,
  max,
  step = 20,
  label,
  onChange,
}: {
  width: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  onChange: (width: number) => void;
}) {
  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const element = e.currentTarget;
    element.setPointerCapture(e.pointerId);
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const startWidth = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const move = (ev: PointerEvent) => {
      if (!element.hasPointerCapture(ev.pointerId)) return;
      onChange(startWidth + (ev.clientX - centerX));
    };
    const up = (ev: PointerEvent) => {
      if (element.hasPointerCapture(ev.pointerId)) {
        element.releasePointerCapture(ev.pointerId);
      }
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(width - step);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onChange(width + step);
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={width}
      tabIndex={0}
      className={classes.resizer}
      style={{ left: `${width}px` }}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  );
}
