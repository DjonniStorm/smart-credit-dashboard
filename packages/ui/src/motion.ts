import type { Transition } from "motion/react";

// Пресеты движения из раздела «Motion» дизайн-системы.

export const ease = {
  standard: [0.2, 0, 0, 1], // easing-standard
  exit: [0.4, 0, 1, 1], // easing-exit
} as const;

export const dur = { fast: 0.12, base: 0.2, slow: 0.32 } as const; // duration-*

export const t = {
  base: { duration: dur.base, ease: ease.standard },
  exit: { duration: dur.fast, ease: ease.exit },
  // Путь заявки: плотная пружина без отскока.
  stage: { type: "spring", stiffness: 380, damping: 38, mass: 1 },
} satisfies Record<string, Transition>;

/** Шаг формы заявки: въезжает со стороны движения, вперёд справа, назад слева. */
export const stepVariants = {
  enter: (dir: 1 | -1) => ({ x: 24 * dir, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: 1 | -1) => ({ x: -24 * dir, opacity: 0, transition: t.exit }),
};
