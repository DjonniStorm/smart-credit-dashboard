import type { Metadata } from "next";

import { ApplicationWorkspace } from "@/widgets/application-panel";

export async function generateMetadata({
  params,
}: PageProps<"/applications/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Заявка № ${id}` };
}

export default async function ApplicationPage({
  params,
}: PageProps<"/applications/[id]">) {
  const { id } = await params;
  return <ApplicationWorkspace id={id} />;
}
