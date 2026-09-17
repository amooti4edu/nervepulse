import type { Metadata } from "next";
import { SpaceDetailView } from "./SpaceDetailView";

export const metadata: Metadata = {
  title: "Space view — Nerve-Pulse",
  description: "Health, open work and activity for a single branch, department or office.",
  openGraph: {
    title: "Space view — Nerve-Pulse",
    description: "A manager's view of their own area.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function SpaceDetailPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  return <SpaceDetailView spaceId={spaceId} />;
}
