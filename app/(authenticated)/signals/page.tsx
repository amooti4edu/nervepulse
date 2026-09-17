import type { Metadata } from "next";
import { Suspense } from "react";
import { SignalsListView } from "./SignalsListView";

export const metadata: Metadata = {
  title: "Signals — Nerve-Pulse",
  description: "Search and filter every signal by type, status, priority, space and date.",
  openGraph: {
    title: "Signals — Nerve-Pulse",
    description: "Full-text search across your organization's signals.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function SignalsPage() {
  return (
    <Suspense fallback={null}>
      <SignalsListView />
    </Suspense>
  );
}
