import type { Metadata } from "next";
import { ProfileView } from "./ProfileView";

export const metadata: Metadata = {
  title: "Profile & role expectations — Nerve-Pulse",
  description: "Your role, primary space, permissions and the recurring responsibilities you own.",
  openGraph: {
    title: "Profile & role expectations — Nerve-Pulse",
    description: "Know what you own and what's due next.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function ProfilePage() {
  return <ProfileView />;
}
