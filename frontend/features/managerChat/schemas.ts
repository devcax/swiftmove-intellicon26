import { z } from "zod";

export const chatCreatedSchema = z.object({ id: z.string() });

const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "tool"]),
  content: z.string(),
  toolName: z.string().nullable().optional(),
  toolOutcome: z.string().nullable().optional(),
});
export type ChatMessage = z.infer<typeof messageSchema>;

export const DEFAULT_CONTEXT = { min: 2, max: 30, default: 6 };

const chatSummarySchema = z.object({ id: z.string(), title: z.string().nullable(), contextMessages: z.number(), updatedAt: z.string() });
export type ChatSummary = z.infer<typeof chatSummarySchema>;
export const chatListSchema = z.object({
  chats: z.array(chatSummarySchema),
  context: z.object({ min: z.number(), max: z.number(), default: z.number() }),
});

export const chatSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  contextMessages: z.number().optional(),
  messages: z.array(messageSchema),
  pendingConfirmations: z.array(z.object({ id: z.string(), actionName: z.string(), summary: z.string(), expiresAt: z.string() })),
});

/** A thing a policy asked for that the manager can provide (the same shape the forms use). Anything unknown is shown as text. */
const missingSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  label: z.string().optional(),
  policyKey: z.string().nullable().optional(),
}).loose();

export const blockedSchema = z.object({ message: z.string(), missing: z.array(missingSchema), policyKey: z.string().nullable().optional() });
export type Blocked = z.infer<typeof blockedSchema>;

export const confirmationSchema = z.object({ token: z.string(), summary: z.string(), actionName: z.string(), expiresAt: z.string() });
export type Confirmation = z.infer<typeof confirmationSchema>;

export const turnSchema = z.object({
  reply: z.object({ id: z.string(), content: z.string() }),
  activity: z.array(z.object({ tool: z.string().optional(), outcome: z.string() })),
  confirmations: z.array(confirmationSchema),
  blocked: z.array(blockedSchema),
  changed: z.array(z.string()),
});
export type Turn = z.infer<typeof turnSchema>;

export const confirmResultSchema = z.object({
  ok: z.boolean(),
  cancelled: z.boolean().optional(),
  changed: z.string().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
}).loose();
export type ConfirmResult = z.infer<typeof confirmResultSchema>;
