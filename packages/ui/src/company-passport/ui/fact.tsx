import { Text } from "@mantine/core";

export function PassportFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Text size="sm">
      <Text span c="dimmed">
        {label}: {" "}
      </Text>
      {value}
    </Text>
  );
}
