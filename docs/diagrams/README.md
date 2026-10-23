# Диаграммы

Исходники в Mermaid, GitHub рендерит их в самих `.md`. Рядом лежат SVG для просмотра вне GitHub.

| Диаграмма        | Файл                                                     | Что показывает                                              |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| Архитектура      | [01-architecture.md](01-architecture.md)                 | сервисы, порты, прокси, ручной seed, зависимости между ними |
| Статусы заявки   | [02-application-statuses.md](02-application-statuses.md) | четыре словаря статусов, маппинг, переходы по плану, этапы  |
| Подача и решение | [03-submission-sequence.md](03-submission-sequence.md)   | клиент, api, воркер, scoring, АРМ                           |
| Таблицы          | [04-data-model.md](04-data-model.md)                     | таблицы PostgreSQL и связи                                  |
| Сущности         | [05-entity-model.md](05-entity-model.md)                 | доменные сущности по `packages/contracts`                   |
| Расхождения      | [plan-discrepancies.md](plan-discrepancies.md)           | где код отличается от `plan.md`                             |

Диаграммы описывают код на момент создания. Там, где `plan.md` и код расходятся, на это указано в тексте и в списке расхождений.

## Перерисовать SVG

Из корня репозитория:

```bash
node docs/diagrams/render.mjs
```

Скрипт рисует все SVG из mermaid-блоков в `.md` через `@mermaid-js/mermaid-cli`. Если Chromium для puppeteer не скачан, передайте путь к установленному Chrome в `CHROME_PATH`. Новый блок в файле нужно добавить в список `sources` в `render.mjs`.
