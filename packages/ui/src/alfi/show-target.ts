const HIGHLIGHT_MS = 1600;

/**
 * Прокручивает к элементу с data-alfi-target, переводит на него фокус
 * и ненадолго подсвечивает рамкой. Стиль подсветки в dock.module.css.
 */
export function showTarget(target: string): void {
  const element = document.querySelector<HTMLElement>(
    `[data-alfi-target="${target}"]`,
  );
  if (!element) {
    return;
  }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({
    behavior: reduced ? "auto" : "smooth",
    block: "center",
  });
  if (!element.hasAttribute("tabindex")) {
    element.setAttribute("tabindex", "-1");
  }
  element.focus({ preventScroll: true });
  element.setAttribute("data-alfi-highlight", "");
  window.setTimeout(() => {
    element.removeAttribute("data-alfi-highlight");
  }, HIGHLIGHT_MS);
}
