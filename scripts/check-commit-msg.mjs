import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: check-commit-msg.mjs <COMMIT_EDITMSG>");
  process.exit(1);
}

const firstLine = readFileSync(file, "utf8")
  .split(/\r?\n/)
  .find((line) => line.trim() && !line.startsWith("#"));

if (!firstLine) {
  console.error("Empty commit message.");
  process.exit(1);
}

if (/^(Merge|Revert)\b/.test(firstLine)) {
  process.exit(0);
}

const conventional =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._/-]+\))?!?: .+/;

if (!conventional.test(firstLine)) {
  console.error(
    `Not a Conventional Commit:\n  ${firstLine}\n\nUse: type(scope)?: subject\nTypes: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert`,
  );
  process.exit(1);
}
