import type { Email } from "@/store/email.schema";

// Interface for the Hillary email format from the backend
interface HillaryEmailRaw {
  sender: string;
  sent_time: string;
  receiver: string[];
  subject: string;
  text: string;
  cc: string[] | null;
  bcc: string[] | null;
  source_file: string;
}

/**
 * Transform Hillary email data from backend format to frontend Email schema
 * @param hillaryEmail - Raw email data from backend
 * @param index - Index for unique ID generation
 * @param isReceived - Whether this is a received email (inbox) or sent email
 */
export function transformHillaryEmail(
  hillaryEmail: HillaryEmailRaw,
  index: number,
  isReceived: boolean = false
): Email {
  // Extract email address from sender string like "H <HDR22@clintonemail.com>"
  const senderMatch = hillaryEmail.sender.match(/<([^>]+)>/);
  const senderEmail = senderMatch ? senderMatch[1] : "unknown@clintonemail.com";

  // Extract sender name (everything before the <email> part)
  const senderName =
    hillaryEmail.sender.replace(/<[^>]+>/, "").trim() ||
    (isReceived ? "Unknown Sender" : "Hillary Clinton");

  // Use the full email text (no truncation)
  const preview = hillaryEmail.text;

  // Convert the sent_time to a more readable format
  const timeString = new Date(hillaryEmail.sent_time).toLocaleString();

  // Generate a unique ID based on the index and source file
  const id = Date.now() + index + (isReceived ? 100000 : 0); // Offset received emails to avoid ID conflicts

  return {
    id,
    from: senderName,
    email: senderEmail,
    subject: hillaryEmail.subject,
    preview,
    time: timeString,
    unread: isReceived, // Received emails are unread, sent emails are read
    hasAttachment: false, // Hillary emails don't have attachment info
    location: isReceived ? "inbox" : "sent", // Received go to inbox, sent go to sent
    tags: ["important"], // Tag as important since these are historical documents
  };
}

/**
 * Load Hillary emails from the backend JSON file
 */
export async function loadHillaryEmails(): Promise<Email[]> {
  try {
    // In a real app, you'd fetch from an API endpoint
    // For now, we'll assume the file is copied to the frontend public folder
    // or accessible via an API endpoint

    // Option 1: If you copy the file to frontend/public/
    // const response = await fetch('/hillary_emails_only.json');

    // Option 2: If you create an API endpoint in your backend
    const response = await fetch("http://localhost:8000/api/hillary-emails");

    if (!response.ok) {
      throw new Error(`Failed to fetch Hillary emails: ${response.statusText}`);
    }

    const hillaryEmailsRaw: HillaryEmailRaw[] = await response.json();

    // Transform the emails to match our frontend schema
    const transformedEmails = hillaryEmailsRaw.map(
      (email, index) => transformHillaryEmail(email, index, false) // false = sent emails
    );

    console.log(`Loaded ${transformedEmails.length} Hillary sent emails`);
    return transformedEmails;
  } catch (error) {
    console.error("Error loading Hillary emails:", error);
    throw error;
  }
}

/**
 * Load a subset of Hillary emails (useful for testing or pagination)
 */
export async function loadHillaryEmailsSubset(limit: number = 50): Promise<Email[]> {
  try {
    // Use the subset endpoint for better performance
    const response = await fetch(
      `http://localhost:8000/api/hillary-emails/subset/${limit}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Hillary emails subset: ${response.statusText}`);
    }

    const hillaryEmailsRaw: HillaryEmailRaw[] = await response.json();

    // Transform the emails to match our frontend schema
    const transformedEmails = hillaryEmailsRaw.map(
      (email, index) => transformHillaryEmail(email, index, false) // false = sent emails
    );

    console.log(`Loaded ${transformedEmails.length} Hillary sent emails (subset)`);
    return transformedEmails;
  } catch (error) {
    console.error("Error loading Hillary emails subset:", error);
    throw error;
  }
}

/**
 * Load Hillary's received emails from the backend JSON file
 */
export async function loadHillaryReceivedEmails(): Promise<Email[]> {
  try {
    // Fetch from the received emails API endpoint
    const response = await fetch("http://localhost:8000/api/hillary-received-emails");

    if (!response.ok) {
      throw new Error(`Failed to fetch Hillary received emails: ${response.statusText}`);
    }

    const hillaryEmailsRaw: HillaryEmailRaw[] = await response.json();

    // Transform the emails to match our frontend schema
    const transformedEmails = hillaryEmailsRaw.map(
      (email, index) => transformHillaryEmail(email, index, true) // true = received emails (inbox)
    );

    console.log(`Loaded ${transformedEmails.length} Hillary received emails`);
    return transformedEmails;
  } catch (error) {
    console.error("Error loading Hillary received emails:", error);
    throw error;
  }
}

/**
 * Load a subset of Hillary's received emails (useful for testing or pagination)
 */
export async function loadHillaryReceivedEmailsSubset(
  limit: number = 50
): Promise<Email[]> {
  try {
    // Use the subset endpoint for better performance
    const response = await fetch(
      `http://localhost:8000/api/hillary-received-emails/subset/${limit}`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Hillary received emails subset: ${response.statusText}`
      );
    }

    const hillaryEmailsRaw: HillaryEmailRaw[] = await response.json();

    // Transform the emails to match our frontend schema
    const transformedEmails = hillaryEmailsRaw.map(
      (email, index) => transformHillaryEmail(email, index, true) // true = received emails (inbox)
    );

    console.log(`Loaded ${transformedEmails.length} Hillary received emails (subset)`);
    return transformedEmails;
  } catch (error) {
    console.error("Error loading Hillary received emails subset:", error);
    throw error;
  }
}
