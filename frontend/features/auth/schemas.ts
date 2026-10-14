import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email.").email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(128, "Use at most 128 characters."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const currentUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  organizationId: z.string(),
  roles: z.array(z.string()),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;
