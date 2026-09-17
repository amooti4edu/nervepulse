import type { Metadata } from "next";
import { NotificationsView } from "./NotificationsView";

export const metadata: Metadata = {
  title: "Notifications — Nerve-Pulse",
  description: "Mentions, forwards and updates on signals you follow.",
  openGraph: {
    title: "Notifications — Nerve-Pulse",
    description: "Everything routed to you, in one place.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function NotificationsPage() {
  return <NotificationsView />;
}
