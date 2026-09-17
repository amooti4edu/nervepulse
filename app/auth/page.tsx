import type { Metadata } from "next";
import { AuthForm } from "./AuthForm";

export const metadata: Metadata = {
  title: "Sign in — Nerve-Pulse",
  description: "Sign in to Nerve-Pulse to capture signals and monitor your organization's live pulse.",
  openGraph: {
    title: "Sign in — Nerve-Pulse",
    description: "Access your organization's live signal dashboard.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function AuthPage() {
  return <AuthForm />;
}
