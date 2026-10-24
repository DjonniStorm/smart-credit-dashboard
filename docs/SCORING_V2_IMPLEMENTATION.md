# Scoring v2: единый рейтинг, факторы и воспроизводимость

## Текущий контракт

`ScoreResponse` возвращает score, grade, PD, risk band, health/readiness/confidence,
recommendation, factors, reasons и next actions. Дополнительно сохраняются:

- `model_version` — версия модели;
- `policy_version` — версия продуктовой policy;
- `feature_snapshot_id` — hash нормализованного входа;
- `computed_at` — время расчёта;
- `missing_sources` — источники, по которым нельзя подтвердить критичные признаки;
- `explainability` и `autonomy_mode`.

Одинаковый нормализованный вход всегда даёт одинаковый `feature_snapshot_id`. Это позволяет
воспроизвести расчёт и связать результат с audit event.

## Правила использования

`score` — нормированная шкала для интерфейса. `pd` — probability of default и не должен
называться фактической вероятностью, пока не проведены калибровка и backtest на размеченном
временном датасете. `recommendation` не является финальным решением: финальное действие делает
policy/decision engine и пишет отдельное событие аудита.

Отсутствующий источник не получает положительный вклад. При неполном наборе критичных источников
`approve` запрещён и результат переводится в `request_info` или `manual_review`.

## Переход к обученной модели

1. Сохранить immutable feature snapshot до решения.
2. Зафиксировать target и временные train/validation/calibration/test окна.
3. Оставить `rules-baseline-v2` champion до завершения validation.
4. Запустить logistic scorecard как основной challenger и gradient boosting как второй challenger.
5. Сравнивать модели по discrimination, calibration, stability и business metrics.
6. Включать новую модель только через model/policy version и shadow period.

Reject inference не выполняется автоматически: rejected applications хранятся как unlabeled,
а псевдоразметка допускается только отдельным экспериментом с зафиксированными предположениями.

## Acceptance gates

- contract tests для Python Pydantic и TypeScript Zod;
- golden cases для grades A/B/C/D и hard-stop факторов;
- snapshot reproducibility test;
- source-missing и consent tests;
- calibration/Brier/ECE regression;
- PSI drift threshold test;
- audit event с model/policy/snapshot versions;
- UI показывает фактор, значение, источник и вклад без раскрытия внутренних порогов.
