import { z } from "zod";

export const EmailLocationSchema = z.enum([
  "inbox",
  "sent",
  "archive",
  "spam",
  "trash",
  "snoozed",
]);

export const EmailTagSchema = z.enum([
  "important",
  "work",
  "personal",
  "todo",
  "social",
  "updates",
  "forums",
  "promotions",
]);

export const EmailSchema = z.object({
  id: z.number(),
  from: z.string(),
  email: z.email(),
  subject: z.string(),
  preview: z.string(),
  time: z.string(),
  unread: z.boolean(),
  starred: z.boolean().default(false),
  hasAttachment: z.boolean(),
  location: EmailLocationSchema,
  tags: z.array(EmailTagSchema).default([]),
});

export const EmailsArraySchema = z.array(EmailSchema);

export type EmailLocation = z.infer<typeof EmailLocationSchema>;
export type EmailTag = z.infer<typeof EmailTagSchema>;
export type Email = z.infer<typeof EmailSchema>;

export const EmailLocation = EmailLocationSchema.enum;
export const EmailTag = EmailTagSchema.enum;
