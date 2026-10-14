import { z } from "zod";
import { request } from "./client";

export const requirementFieldSchema = z.object({
  name: z.string(),
  // A string, not an enum: a type this screen does not know yet must show as a notice, never fail the whole form.
  type: z.string(),
  label: z.string(),
  policyKey: z.string(),
});

export const requirementsSchema = z.object({
  fields: z.array(requirementFieldSchema),
  notices: z.array(z.object({ message: z.string(), policyKey: z.string() })),
});

export type RequirementField = z.infer<typeof requirementFieldSchema>;
export type Requirements = z.infer<typeof requirementsSchema>;

/** What an action needs from the person, according to the published policies. `match` narrows it (for example a milestone). */
export async function fetchRequirements(actionName: string, match: Record<string, string> = {}): Promise<Requirements> {
  const query = new URLSearchParams(match).toString();
  const path = `/api/meta/actions/${encodeURIComponent(actionName)}/requirements${query ? `?${query}` : ""}`;
  return requirementsSchema.parse(await request<unknown>(path));
}
