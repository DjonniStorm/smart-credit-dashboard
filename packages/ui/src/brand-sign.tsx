/**
 * Знак Альфи-Банка: буква «А» в наушниках Альфи с его антенной.
 * Наушники рисуются цветом текста, поэтому знак виден в светлой и тёмной теме.
 */
export function BrandSign({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden
      focusable="false"
    >
      <path
        d="M24 10 V5"
        stroke="var(--kk-brand-bright)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="4.5" r="3.5" fill="#FFB81C" />
      <path
        d="M8 28 C8 8 40 8 40 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="3" y="23" width="9" height="14" rx="4.5" fill="currentColor" />
      <rect x="36" y="23" width="9" height="14" rx="4.5" fill="currentColor" />
      <path
        d="M15.5 43 L24 19 L32.5 43"
        fill="none"
        stroke="var(--kk-brand-bright)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 35 H29"
        stroke="var(--kk-brand-bright)"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
