import Image from "next/image";
import { cn } from "@/lib/utils";

/** Decorative mark; the surrounding wordmark or link supplies its accessible name. */
export function BrandIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/icon.svg"
      alt=""
      aria-hidden="true"
      width={64}
      height={64}
      unoptimized
      className={cn("size-10 shrink-0", className)}
    />
  );
}
