import type { Metadata } from "next";
import { SettingsView } from "./SettingsView";

export const metadata: Metadata = {
  title: "Organization settings — Nerve-Pulse",
  description: "Manage your organization's spaces, people and roles.",
  openGraph: {
    title: "Organization settings — Nerve-Pulse",
    description: "Shape the structure your signals flow through.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function SettingsPage() {
  return <SettingsView />;
}
