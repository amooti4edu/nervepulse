import type { Metadata } from "next";
import { OnboardingView } from "./OnboardingView";

export const metadata: Metadata = {
  title: "Set up your organization — Nerve-Pulse",
  description: "Name your organization, add branches and departments, and invite your team.",
  openGraph: {
    title: "Set up your organization — Nerve-Pulse",
    description: "Three steps to a live organizational pulse.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function OnboardingPage() {
  return <OnboardingView />;
}
