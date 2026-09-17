import type { Metadata } from "next";
import { CaptureView } from "./CaptureView";

export const metadata: Metadata = {
  title: "Capture a signal — Nerve-Pulse",
  description:
    "One box: describe what happened, @-tag the people or places involved, and it becomes a tracked signal.",
  openGraph: {
    title: "Capture a signal — Nerve-Pulse",
    description: "Type it once. Nerve-Pulse structures and routes it.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function CapturePage() {
  return <CaptureView />;
}
