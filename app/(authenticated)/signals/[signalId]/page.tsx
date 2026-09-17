import type { Metadata } from "next";
import { SignalDetailView } from "./SignalDetailView";

export const metadata: Metadata = {
  title: "Signal — Nerve-Pulse",
  description: "Owner, status, related signals, comments and forwards for one signal.",
  openGraph: {
    title: "Signal — Nerve-Pulse",
    description: "The full record: who owns it, where it lives, what it connects to.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ signalId: string }>;
}) {
  const { signalId } = await params;
  return <SignalDetailView signalId={signalId} />;
}
