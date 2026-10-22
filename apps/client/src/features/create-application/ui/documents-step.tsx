import { ActionIcon, Group, Select, Stack, Text } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { IconFileText, IconPaperclip, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import type { AttachedDocument } from "@repo/contracts/cabinet";

import { lx, tx } from "@/shared/i18n";

import classes from "./application-wizard.module.css";

const t = lx.wizard;
type Kind = AttachedDocument["kind"];
const recommended: Kind[] = ["statement", "reporting", "tax_certificate"];
const kindOptions = (Object.keys(t.kinds) as Kind[]).map((k) => ({
  value: k,
  label: t.kinds[k],
}));

const ACCEPT = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/** Шаг «Документы»: зона перетаскивания, рекомендуемые документы, список файлов. */
export function DocumentsStep({
  documents,
  onChange,
}: {
  documents: AttachedDocument[];
  onChange: (next: AttachedDocument[]) => void;
}) {
  const [rejected, setRejected] = useState(false);

  return (
    <Stack gap="lg">
      <div className={classes.docsGrid}>
        <Dropzone
          onDrop={(files) => {
            setRejected(false);
            onChange([
              ...documents,
              ...files.map((f) => ({
                id: crypto.randomUUID(),
                name: f.name,
                kind: "other" as const,
                sizeBytes: f.size,
                addedAt: new Date().toISOString(),
              })),
            ]);
          }}
          onReject={() => setRejected(true)}
          maxSize={10 * 1024 ** 2}
          accept={ACCEPT}
          className={classes.dropzone}
        >
          <Group gap="md" wrap="nowrap" align="center" mih={96}>
            <IconPaperclip
              size={24}
              stroke={1.5}
              aria-hidden
              className={classes.dropIcon}
            />
            <div>
              <Text size="sm">
                {t.drop} <span className={classes.link}>{t.dropLink}</span>
              </Text>
              <Text size="xs" c="dimmed">
                {t.dropAccept}
              </Text>
            </div>
          </Group>
        </Dropzone>
        <div className={classes.recommended}>
          <Text size="sm" fw={600} mb="xs">
            {t.recommended}
          </Text>
          <ul>
            {recommended.map((k) => (
              <li key={k}>
                <Text size="sm">{t.kinds[k]}</Text>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {rejected && (
        <Text size="sm" c="var(--kk-danger)" role="alert">
          {t.dropReject}
        </Text>
      )}

      {documents.length === 0 ? (
        <Text size="sm" c="dimmed">
          {tx.wizard.documentsEmpty}
        </Text>
      ) : (
        <ul className={classes.files}>
          {documents.map((d) => (
            <li key={d.id} className={classes.file}>
              <IconFileText size={20} stroke={1.5} aria-hidden />
              <div className={classes.fileName}>
                <Text size="sm" truncate>
                  {d.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {Math.max(1, Math.round(d.sizeBytes / 1024))} КБ
                </Text>
              </div>
              <Select
                aria-label={`${t.kindLabel}: ${d.name}`}
                data={kindOptions}
                value={d.kind}
                allowDeselect={false}
                size="sm"
                className={classes.fileKind}
                onChange={(v) =>
                  onChange(
                    documents.map((x) =>
                      x.id === d.id
                        ? { ...x, kind: (v ?? "other") as Kind }
                        : x,
                    ),
                  )
                }
              />
              <ActionIcon
                variant="subtle"
                size={40}
                aria-label={`${tx.wizard.remove}: ${d.name}`}
                onClick={() => onChange(documents.filter((x) => x.id !== d.id))}
              >
                <IconTrash size={18} stroke={1.5} aria-hidden />
              </ActionIcon>
            </li>
          ))}
        </ul>
      )}
      <Text size="xs" c="dimmed">
        {tx.wizard.documentsNote}
      </Text>
    </Stack>
  );
}
