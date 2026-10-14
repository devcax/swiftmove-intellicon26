import { z } from "zod";
import { request } from "@/shared/api/client";

const recordedSchema = z.object({ id: z.string(), name: z.string(), type: z.string() });
const uploadedSchema = z.object({ attachmentId: z.string(), filename: z.string().nullable(), mimeType: z.string(), size: z.number() });

export interface RecordEvidenceInput {
  subjectType: "DRIVER" | "JOB" | "PENDING";
  subjectId: string;
  name: string;
  type: string;
  value?: Record<string, unknown>;
  attachmentId?: string;
}

export async function recordEvidence(input: RecordEvidenceInput): Promise<void> {
  recordedSchema.parse(await request<unknown>("/api/evidence", { method: "POST", body: JSON.stringify(input) }));
}

/** Upload one JPEG, PNG or PDF. The body is the file itself; the server checks it by its own bytes. */
export async function uploadEvidenceFile(file: File): Promise<string> {
  const uploaded = uploadedSchema.parse(
    await request<unknown>("/api/evidence/upload", {
      method: "POST",
      headers: { "Content-Type": file.type, "X-Filename": file.name },
      body: file,
    }),
  );
  return uploaded.attachmentId;
}
