"use client";

import { useRef, useState } from "react";
import { Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  AttachmentValidationError,
  uploadSignalAttachment,
} from "@/lib/attachments";

type PendingFile = { file: File; id: string };

/**
 * Two usage modes:
 * - `signalId` known up front (signal detail page): files upload immediately on pick.
 * - `signalId` not yet known (Capture, before the signal is inserted): files
 *   are held locally and `getPendingFiles()` lets the caller upload them
 *   once the new signal's id exists.
 */
export function AttachmentPicker({
  signalId,
  uploadedBy,
  onUploaded,
  onPendingChange,
}: {
  signalId?: string;
  uploadedBy?: string;
  onUploaded?: () => void;
  onPendingChange?: (files: PendingFile[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    if (signalId && uploadedBy) {
      for (const file of files) {
        const id = crypto.randomUUID();
        setBusyId(id);
        try {
          await uploadSignalAttachment(signalId, file, uploadedBy);
          onUploaded?.();
        } catch (err) {
          toast.error(
            err instanceof AttachmentValidationError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Upload failed",
          );
        } finally {
          setBusyId(null);
        }
      }
    } else {
      setPending((prev) => {
        const next = [...prev, ...files.map((file) => ({ file, id: crypto.randomUUID() }))];
        onPendingChange?.(next);
        return next;
      });
    }

    if (inputRef.current) inputRef.current.value = "";
  }

  function removePending(id: string) {
    setPending((prev) => {
      const next = prev.filter((p) => p.id !== id);
      onPendingChange?.(next);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_ATTACHMENT_MIME_TYPES.join(",")}
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        {busyId ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Paperclip className="size-3.5" />
        )}
        Attach files
      </button>

      {pending.length > 0 && (
        <ul className="space-y-1">
          {pending.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1 text-xs"
            >
              <Paperclip className="size-3 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{p.file.name}</span>
              <button
                type="button"
                onClick={() => removePending(p.id)}
                className="text-muted-foreground hover:text-critical"
                aria-label={`Remove ${p.file.name}`}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Uploads every locally-held pending file for a Capture-mode picker once
 * the signal id is known. Exported so CaptureView can drive it explicitly
 * after the signal insert succeeds.
 */
export async function uploadPendingFiles(
  files: PendingFile[],
  signalId: string,
  uploadedBy: string,
) {
  for (const { file } of files) {
    await uploadSignalAttachment(signalId, file, uploadedBy);
  }
}

export type { PendingFile };