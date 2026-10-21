import { Group, Stack, Text, Title } from "@mantine/core";

import type { ScoringResult } from "@repo/contracts/application";

import { formatDateTime } from "../model/format";
import { riskLabel } from "../model/labels";
import classes from "./panel.module.css";

const MAX_POINTS = 25;
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

/**
 * Разложение балла по признакам: что снизило риск, что повысило.
 * Балл описывает риск и сам по себе не решение.
 */
export function ScoreBreakdown({ scoring }: { scoring: ScoringResult }) {
  const factors = [...scoring.factors].sort((a, b) => a.points - b.points);
  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-end" gap="sm">
        <Stack gap={0}>
          <Text size="sm" c="dimmed">
            {scoring.model}
          </Text>
          <Group gap="xs" align="baseline">
            <Title order={2} className={classes.num}>
              {scoring.score}
            </Title>
            <Text c="dimmed">
              из 100, {riskLabel[scoring.band].toLowerCase()}
            </Text>
          </Group>
        </Stack>
        <Text size="xs" c="dimmed">
          Рассчитан {formatDateTime(scoring.computedAt)}
        </Text>
      </Group>
      <Text size="sm" c="dimmed">
        База {scoring.base}. Плюс снижает риск, минус повышает. От 70 риск
        низкий, от 50 до 69 умеренный, ниже 50 высокий.
      </Text>
      <div role="table" aria-label="Факторы скоринга">
        <div className={classes.row} role="row">
          <Text size="xs" c="dimmed" role="columnheader">
            Признак
          </Text>
          <Text size="xs" c="dimmed" role="columnheader">
            Значение
          </Text>
          <span className={classes.spacer} aria-hidden />
          <Text size="xs" c="dimmed" ta="right" role="columnheader">
            Баллы
          </Text>
        </div>
        {factors.map((f) => (
          <div key={f.id} className={classes.row} role="row">
            <Text size="sm" role="cell">
              {f.label}
            </Text>
            <Text size="sm" c="dimmed" role="cell">
              {f.input}
            </Text>
            <div className={classes.track} aria-hidden>
              {f.points !== 0 && (
                <span
                  className={classes.bar}
                  data-sign={f.points > 0 ? "plus" : "minus"}
                  style={{
                    width: `${(Math.min(Math.abs(f.points), MAX_POINTS) / MAX_POINTS) * 50}%`,
                  }}
                />
              )}
            </div>
            <Text size="sm" className={classes.points} role="cell">
              {signed(f.points)}
            </Text>
          </div>
        ))}
      </div>
    </Stack>
  );
}
