import { EmailsArraySchema } from "@/store/email.schema";
import emailsJson from "./emails.json";

const parseResult = EmailsArraySchema.safeParse(emailsJson);

if (!parseResult.success) {
  console.error("Failed to parse emails data:", parseResult.error);
  throw new Error("Invalid emails data format");
}

export const mockEmails = parseResult.data;
