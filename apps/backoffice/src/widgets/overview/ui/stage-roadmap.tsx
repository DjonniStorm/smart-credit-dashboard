"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import type { ApplicationStage } from "@repo/contracts/application";

import { stageLabel, stageOrder } from "@/entities/application";

import classes from "./stage-roadmap.module.css";

type StageEntry = { stage: ApplicationStage; count: number };

type Segment = { path: string; animated: boolean };

/** «Путь заявок»: этапы дорожкой слева направо и сверху вниз.
    Текущий этап — тот, где сейчас больше всего заявок; предыдущие приглушены,
    будущие затемнены. Соединения рисуются поверх сетки и пересчитываются при ресайзе. */
export function StageRoadmap({ byStage }: { byStage: readonly StageEntry[] }) {
  const listRef = useRef<HTMLOListElement>(null);
  const [segments, setSegments] = useState<Segment[] | null>(null);

  const countByStage = new Map(byStage.map((item) => [item.stage, item.count]));
  const total = byStage.reduce((sum, item) => sum + item.count, 0);
  const maxStage = byStage.reduce<StageEntry | undefined>(
    (peak, item) => (peak && peak.count >= item.count ? peak : item),
    undefined,
  );
  const currentIndex =
    maxStage && maxStage.count > 0 ? stageOrder.indexOf(maxStage.stage) : -1;

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    const measure = () => {
      const items = Array.from(list.children) as HTMLLIElement[];
      const boxes = items.map((item) => ({
        left: item.offsetLeft,
        top: item.offsetTop,
        width: item.offsetWidth,
        height: item.offsetHeight,
      }));
      const next: Segment[] = [];
      for (let i = 0; i < boxes.length - 1; i += 1) {
        const a = boxes[i];
        const b = boxes[i + 1];
        if (!a || !b) {
          continue;
        }
        const startX = a.left + a.width;
        const startY = a.top + a.height / 2;
        const endX = b.left;
        const endY = b.top + b.height / 2;
        const animated = i === currentIndex - 1;
        if (Math.abs(a.top - b.top) < Math.max(a.height, b.height) / 2) {
          next.push({
            path: `M ${startX} ${startY} L ${endX} ${endY}`,
            animated,
          });
        } else {
          const midY = (a.top + a.height + b.top) / 2;
          next.push({
            path: `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`,
            animated,
          });
        }
      }
      setSegments(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [currentIndex, total]);

  if (total === 0) {
    return (
      <p className={classes.empty}>В периоде нет заявок на этапах обработки.</p>
    );
  }

  return (
    <div className={classes.root}>
      <ol
        ref={listRef}
        className={classes.roadmap}
        aria-label="Порядок этапов обработки заявки"
      >
        {stageOrder.map((stage, index) => {
          const count = countByStage.get(stage) ?? 0;
          const share = total > 0 ? Math.round((count / total) * 100) : 0;
          const state =
            index < currentIndex
              ? "done"
              : index === currentIndex
                ? "current"
                : "next";
          return (
            <motion.li
              key={stage}
              className={classes.stage}
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: index * 0.04,
                ease: [0.2, 0, 0, 1],
              }}
            >
              <span className={classes.stageLabel}>{stageLabel[stage]}</span>
              <strong className={classes.stageCount}>{count}</strong>
              <span className={classes.stageShare}>{share}%</span>
            </motion.li>
          );
        })}
      </ol>
      {segments && segments.length > 0 && (
        <svg className={classes.connectors} aria-hidden focusable="false">
          <defs>
            <marker
              id="stage-roadmap-arrow"
              viewBox="0 0 8 8"
              refX="6"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L8 4 L0 8 Z" className={classes.arrowHead} />
            </marker>
          </defs>
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.path}
              className={
                segment.animated ? classes.segmentAnimated : classes.segment
              }
              markerEnd="url(#stage-roadmap-arrow)"
            />
          ))}
        </svg>
      )}
    </div>
  );
}
