"use client";

import {
  Button,
  Card,
  FileInput,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useState } from "react";

import type { ClientRequest } from "@repo/contracts/cabinet";

import { useAnswerRequest } from "@/entities/application";
import { tx } from "@/shared/i18n";
import { InlineError } from "@/shared/ui/query-state";

const t = tx.application.request;

/** Ответ на запрос банка: текст и необязательный документ. */
export function AnswerRequestForm({
  applicationId,
  request,
}: {
  applicationId: string;
  request: ClientRequest;
}) {
  const answer = useAnswerRequest(applicationId);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [touched, setTouched] = useState(false);
  const error = touched && !text.trim() ? t.required : null;

  function send() {
    setTouched(true);
    if (!text.trim()) return;
    answer.mutate({
      requestId: request.id,
      answer: {
        text: text.trim(),
        documents: file
          ? [
              {
                id: `${file.name}-${file.size}`,
                name: file.name,
                kind: request.documentKind ?? "other",
                sizeBytes: file.size,
                addedAt: new Date().toISOString(),
              },
            ]
          : [],
      },
    });
  }

  return (
    <Card data-testid="answer-request">
      <Stack gap="md">
        <Title order={2} size="h3">
          {t.title}
        </Title>
        <Text>{request.question}</Text>
        <Text size="sm" c="dimmed">
          {t.why}: {request.why}
        </Text>
        <Textarea
          label={t.answer}
          placeholder={t.answerPlaceholder}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          onBlur={() => setTouched(true)}
          error={error}
          autosize
          minRows={3}
          maxLength={1000}
        />
        <FileInput
          label={t.file}
          description={t.fileNote}
          placeholder={t.filePlaceholder}
          value={file}
          onChange={setFile}
          clearable
          accept="application/pdf,image/png,image/jpeg"
        />
        {answer.isError && <InlineError>{answer.error.message}</InlineError>}
        <div>
          <Button
            data-testid="answer-request-submit"
            onClick={send}
            loading={answer.isPending}
          >
            {t.send}
          </Button>
        </div>
      </Stack>
    </Card>
  );
}
