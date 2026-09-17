import type { Metadata } from "next";
import { PulseView } from "./PulseView";

export const metadata: Metadata = {
  title: "Company Pulse — Nerve-Pulse",
  description:
    "Live organizational health: critical issues, pending requests, space health and the latest signals across your company.",
  openGraph: {
    title: "Company Pulse — Nerve-Pulse",
    description: "A live overview of organizational health you can drill into.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function PulsePage() {
  return <PulseView />;
}
