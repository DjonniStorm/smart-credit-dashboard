<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/TURBO.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

## Условие трека

- `docs/TRACK.md`: условие кейса по PDF. Текст совпадает с оригиналом, кроме одного помеченного пропуска
  (фраза про новостную ленту). Свой текст туда не дописывать.
- `docs/CLARIFICATIONS.md`: разъяснения организаторов, читать вместе с `TRACK.md`. Как они соотносятся с
  условием, написано в самом файле.
- `docs/QA_SESSION_QUESTIONS.md`: ответы организаторов с вебинара. Вместе с `TRACK.md` это основной
  источник требований; при расхождении с чужими планами правы они.
- `docs/smart-credit-dashboard-plan.pdf`: итоговый план продукта, принятый командой. `docs/TECH_ADDENDUM.md`:
  техническое дополнение к нему (статусы, API, таблицы, формулы). При расхождении с кодом правим оба.
- `docs/REQUIREMENTS.md` пишет человек, агенты его не правят.

## Перед началом работы

`git fetch origin` и `git log --oneline HEAD..origin/dev`: если вывод не пустой, сначала
`git rebase origin/dev`.

## Правила зависимостей в монорепо

- `apps/*` зависят от `packages/*`, но не наоборот: пакет не импортирует приложение.
- `apps/*` не зависят друг от друга. Общий код (типы, компоненты, утилиты) выносится в `packages/*`.
  Приложения общаются только по HTTP; типы этих контрактов лежат в `packages/contracts`.
- Каждый импорт другого пакета объявлен в его `package.json` (`"workspace:*"`), никаких `../../`
  за пределы своей папки.

Проверяется командой `pnpm boundaries` (`turbo boundaries`, теги `app` и `package` в `turbo.json`
каждого пакета) и в CI.
