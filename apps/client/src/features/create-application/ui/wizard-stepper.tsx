import { IconCheck } from "@tabler/icons-react";

import { lx, tx } from "@/shared/i18n";

import classes from "./application-wizard.module.css";

/** Степпер из пяти шагов. Вернуться можно на любой пройденный шаг. */
export function WizardStepper({
  step,
  maxStep,
  onGo,
}: {
  step: number;
  maxStep: number;
  onGo: (step: number) => void;
}) {
  const steps = lx.steps;
  return (
    <nav aria-label={tx.wizard.stepsLabel}>
      <p className={classes.stepCaption} aria-hidden>
        {tx.wizard.stepOf(step + 1, steps.length)}: {steps[step]}
      </p>
      <ol className={classes.stepper}>
        {steps.map((label, i) => {
          const state = i === step ? "current" : i <= maxStep ? "done" : "next";
          return (
            <li key={label} className={classes.stepItem} data-state={state}>
              <button
                type="button"
                className={classes.stepButton}
                aria-current={i === step ? "step" : undefined}
                disabled={i > maxStep}
                onClick={() => onGo(i)}
              >
                <span className={classes.stepIndex} aria-hidden>
                  {state === "done" && i < step ? (
                    <IconCheck size={14} stroke={2} />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className={classes.stepLabel}>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
