import type { Metadata } from "next";

import { lx } from "@/shared/i18n";
import { DocumentList } from "@/widgets/document-list";

export const metadata: Metadata = {
  title: lx.documents.title,
  robots: { index: false },
};

export default function DocumentsPage() {
  return <DocumentList />;
}
