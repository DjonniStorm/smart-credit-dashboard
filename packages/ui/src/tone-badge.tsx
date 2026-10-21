import { Badge, type BadgeProps } from "@mantine/core";
import { type Icon as TablerIcon } from "@tabler/icons-react";
import { type JSX, type ReactNode } from "react";

export type Tone = "neutral" | "action" | "success" | "danger";

// Цвета из токенов: action = «ход за тем, кто смотрит на экран».
const toneVars: Record<Tone, { bg: string; color: string }> = {
  neutral: {
    bg: "var(--kk-surface-sunken)",
    color: "var(--mantine-color-text)",
  },
  action: { bg: "var(--kk-amber-soft)", color: "var(--kk-amber-ink)" },
  success: { bg: "var(--kk-success-soft)", color: "var(--kk-success)" },
  danger: { bg: "var(--kk-danger-soft)", color: "var(--kk-danger)" },
};

/** Бейдж с тоном и иконкой: статус не передаётся одним цветом. */
export function ToneBadge({
  tone,
  icon: Icon,
  children,
  size,
}: {
  tone: Tone;
  icon: TablerIcon;
  children: ReactNode;
  size?: BadgeProps["size"];
}): JSX.Element {
  const { bg, color } = toneVars[tone];
  return (
    <Badge
      size={size}
      leftSection={<Icon size={16} stroke={1.75} aria-hidden />}
      style={{ "--badge-bg": bg, "--badge-color": color }}
    >
      {children}
    </Badge>
  );
}
