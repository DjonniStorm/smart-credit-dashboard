// SessionStart-хук Claude Code: сообщает, отстала ли текущая ветка от origin/dev.
// Ничего не меняет в рабочей копии, только fetch и подсчёт коммитов.
import { execFileSync } from "node:child_process";

const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();

try {
  git("fetch", "--quiet", "origin");
  const branch = git("branch", "--show-current");
  const behind = Number(git("rev-list", "--count", "HEAD..origin/dev"));
  const dirty = git("status", "--porcelain") !== "";
  const lines = [
    `Ветка ${branch}: отстаёт от origin/dev на ${behind} коммит(ов).`,
  ];
  if (behind > 0) {
    lines.push(
      "Перед работой подтяни dev: git rebase origin/dev" +
        (dirty
          ? " (сначала закоммить или отложи изменения WIP-коммитом)."
          : "."),
    );
  }
  console.log(lines.join("\n"));
} catch {
  console.log(
    "Не удалось сверить ветку с origin/dev: проверь вручную git fetch и git log HEAD..origin/dev.",
  );
}
