# Scoring, decision engine и autonomy

## Контур

`CompaniesService` получает ответы ЕГРЮЛ/БКИ/ФНС и отправляет их в scoring. Scoring возвращает score, PD, grade, confidence, факторы и рекомендацию. API не принимает ML-рекомендацию вслепую: `decision-engine.ts` применяет детерминированные правила продукта, формирует `rules`, `reasons` и режим autonomy. Результат и версия модели записываются в `application_events`.

## ML-контроль

`apps/scoring/app/ml_pipeline.py` содержит общий evaluation contract для champion/challenger (Brier, log-loss, ECE, AUC), isotonic calibration и PSI drift report. `/v1/models/evaluation` отдаёт регрессионный отчёт, `/v1/models/drift` принимает baseline/current score distributions. PSI >= 0.2 рекомендует остановить autonomy.

До production-модели необходимо подключить временной train/validation split, registry версий, champion/challenger deployment и мониторинг feature drift. Synthetic dataset используется только для smoke и демонстрации.

## Autonomy

Сейчас режимы безопасны по умолчанию: `shadow` не меняет решение, `assist` показывает рекомендацию сотруднику, `controlled` допускается только после eligibility-проверок. При drift, росте ошибок или снижении confidence переключаемся в `paused`; ручное изменение уровня должно иметь audit reason.

## Alfi

Alfi подключается через отдельный adapter в shadow mode: ответы валидируются схемой, PII редактируется, действия записи запрещены. После оценки качества и latency можно включать controlled mode с детерминированным fallback.
