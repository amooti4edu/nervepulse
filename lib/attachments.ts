"use client";

import { supabase } from "@/lib/supabase/client";

export const ATTACHMENTS_BUCKET = "signal-attachments";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB, matches the bucket's server-side cap

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
] as const;

export class AttachmentValidationError extends Error {}

function assertUploadable(file: File) {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new AttachmentValidationError(
      `${file.name} is ${(file.size / (1024 * 1024)).toFixed(1)} MB — the limit is 10 MB.`,
    );
  }
  if (
    file.type &&
    !ALLOWED_ATTACHMENT_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number],
    )
  ) {
    throw new AttachmentValidationError(`${file.name} isn't a supported file type.`);
  }
}

/**
 * Uploads a file to the signal-attachments bucket under `<signalId>/...`
 * (RLS on storage.objects checks that folder segment against org
 * membership) and records it in signal_attachments. Call this once the
 * signal already has an id — i.e. after the initial insert when capturing,
 * or any time from the signal detail page.
 */
export async function uploadSignalAttachment(signalId: string, file: File, uploadedBy: string) {
  assertUploadable(file);

  const safeName = file.name.replace(/[^A-Za-z0-9_.\-']/g, "_");
  const path = `${signalId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, file, { contentType: file.type || undefined });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("signal_attachments").insert({
    signal_id: signalId,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type || null,
    uploaded_by: uploadedBy,
  });
  if (insertError) {
    // Best-effort cleanup so a failed metadata write doesn't leave an
    // orphaned, inaccessible object behind.
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
    throw insertError;
  }
}

/** Signed URL for downloading/previewing a private attachment. */
export async function getAttachmentUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, 60 * 10); // 10 minutes
  if (error) throw error;
  return data.signedUrl;
}