"use client";

import { Button } from "@mantine/core";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import type { ApplicationStage, WaitingOn } from "@repo/contracts/application";
import { backofficeText, i18n } from "@repo/i18n";

import classes from "./application-panel.module.css";

type Segment = { path: string; animated: boolean };

/** Дорожка этапов заявки. Блоки со стрелками змейкой, как в карточке
    «Путь заявок» обзора: слева направо и сверху вниз, текущий этап выделен,
    пунктир к нему анимирован. Клик по блоку выбирает этап, как раньше. */
export function WorkflowSteps({
  stages,
  current,
  isTerminal,
  waitingOn,
  selectedStage,
  onSelect,
}: {
  stages: readonly ApplicationStage[];
  current: number;
  isTerminal: boolean;
  waitingOn: WaitingOn;
  selectedStage: ApplicationStage;
  onSelect: (stage: ApplicationStage) => void;
}) {
  const tx = backofficeText(i18n.defaultLocale);
  const listRef = useRef<HTMLOListElement>(null);
  const [segments, setSegments] = useState<Segment[] | null>(null);

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
        const animated = i === current - 1;
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
  }, [current]);

  return (
    <div className={classes.workflowRoadmap}>
      <ol
        ref={listRef}
        className={classes.workflowGrid}
        aria-label={tx.workflow.stepsLabel}
      >
        {stages.map((stage, index) => {
          const isDone = index < current || (isTerminal && index === current);
          const isCurrent = index === current;
          const state = isDone
            ? "done"
            : isCurrent
              ? isTerminal || waitingOn === "client" || waitingOn === "system"
                ? "waiting"
                : "current"
              : "next";
          const isSelected = stage === selectedStage;
          return (
            <motion.li
              key={stage}
              className={classes.workflowItem}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: index * 0.04,
                ease: [0.2, 0, 0, 1],
              }}
            >
              <Button
                variant="subtle"
                color="dark"
                className={classes.workflowCard}
                data-state={state}
                data-selected={isSelected}
                onClick={() => onSelect(stage)}
                aria-pressed={isSelected}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span className={classes.workflowText}>
                  <strong>{tx.workflow.stages[stage].label}</strong>
                  <small>{tx.workflow.stages[stage].short}</small>
                </span>
              </Button>
            </motion.li>
          );
        })}
      </ol>
      {segments && segments.length > 0 && (
        <svg
          className={classes.workflowConnectors}
          aria-hidden
          focusable="false"
        >
          <defs>
            <marker
              id="workflow-arrow"
              viewBox="0 0 8 8"
              refX="6"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M0 0 L8 4 L0 8 Z"
                className={classes.workflowArrowHead}
              />
            </marker>
          </defs>
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.path}
              className={
                segment.animated
                  ? classes.workflowSegmentAnimated
                  : classes.workflowSegment
              }
              markerEnd="url(#workflow-arrow)"
            />
          ))}
        </svg>
      )}
    </div>
  );
}
