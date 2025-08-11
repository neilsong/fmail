/**
 * Comprehensive API documentation for workflow functions
 * This documentation is provided to the LLM when generating new workflows
 */

export const WORKFLOW_API_DOCUMENTATION = `
# FMail Workflow API Documentation

## Overview
Workflows are JavaScript functions that automatically process emails based on triggers and conditions.
They have access to three main objects: \`email\`, \`context\`, and \`utils\`.

## Trigger Events
- \`email_received\`: Triggered when a new email arrives
- \`email_closed\`: Triggered when user closes/dismisses an email
- \`user_action\`: Triggered when user performs actions (for pattern detection)

## Available Objects

### \`email\` Object
The email object provides access to email data and actions.

#### Properties (Read-only):
- \`email.id\`: string - Unique email identifier
- \`email.sender\`: string - Email sender address
- \`email.subject\`: string - Email subject line
- \`email.body\`: string - Email body content
- \`email.labels\`: string[] - Array of current labels
- \`email.is_read\`: boolean - Whether email is marked as read
- \`email.is_starred\`: boolean - Whether email is starred
- \`email.received_at\`: Date - When email was received
- \`email.attachments\`: string[] - Array of attachment names

#### Actions:
- \`email.archive()\`: Archive the email
- \`email.delete()\`: Delete the email
- \`email.star()\`: Star the email
- \`email.unstar()\`: Remove star from email
- \`email.markRead()\`: Mark email as read
- \`email.markUnread()\`: Mark email as unread
- \`email.addLabel(label)\`: Add a label to the email
- \`email.removeLabel(label)\`: Remove a label from the email
- \`email.moveToSpam()\`: Move email to spam folder
- \`email.moveToTrash()\`: Move email to trash folder

### \`context\` Object
The context object provides information about the current state.

#### Properties:
- \`context.user_id\`: string - Current user identifier
- \`context.location\`: 'home' | 'detail' | 'unknown' - Where the action occurred
- \`context.time_of_day\`: number - Hour of day (0-23)
- \`context.day_of_week\`: number - Day of week (0-6, Sunday=0)
- \`context.session_id\`: string - Current session identifier

#### Methods:
- \`context.isWeekend()\`: boolean - Returns true if it's Saturday or Sunday
- \`context.isBusinessHours()\`: boolean - Returns true if it's 9 AM to 5 PM

### \`utils\` Object
Utility functions for common operations.

#### String Matching:
- \`utils.contains(text, pattern)\`: boolean - Case-insensitive substring check
- \`utils.startsWith(text, pattern)\`: boolean - Case-insensitive prefix check
- \`utils.endsWith(text, pattern)\`: boolean - Case-insensitive suffix check
- \`utils.matches(text, regex)\`: boolean - Regular expression matching

#### Array Operations:
- \`utils.hasAny(array, values)\`: boolean - Check if array contains any of the values
- \`utils.hasAll(array, values)\`: boolean - Check if array contains all values

### \`console\` Object
- \`console.log(...args)\`: Log messages (prefixed with workflow ID)

## Example Workflows

### 1. Auto-archive newsletters
\`\`\`javascript
// Trigger: email_received
if (utils.contains(email.subject, "newsletter") || 
    utils.contains(email.sender, "noreply")) {
  email.archive();
  console.log("Auto-archived newsletter from " + email.sender);
}
\`\`\`

### 2. Auto-star important emails
\`\`\`javascript
// Trigger: email_received
const importantSenders = ["boss@company.com", "client@important.com"];
if (utils.hasAny([email.sender], importantSenders)) {
  email.star();
  email.addLabel("Important");
  console.log("Auto-starred important email");
}
\`\`\`

### 3. Auto-label by sender domain
\`\`\`javascript
// Trigger: email_received
if (utils.contains(email.sender, "@github.com")) {
  email.addLabel("GitHub");
} else if (utils.contains(email.sender, "@linkedin.com")) {
  email.addLabel("LinkedIn");
}
\`\`\`

### 4. Time-based processing
\`\`\`javascript
// Trigger: email_received
if (!context.isBusinessHours() && utils.contains(email.subject, "urgent")) {
  email.star();
  email.addLabel("After Hours Urgent");
  console.log("Marked after-hours urgent email");
}
\`\`\`

### 5. Auto-read promotional emails
\`\`\`javascript
// Trigger: email_received
const promoKeywords = ["sale", "discount", "offer", "promotion"];
const hasPromoKeyword = promoKeywords.some(keyword => 
  utils.contains(email.subject, keyword)
);

if (hasPromoKeyword) {
  email.markRead();
  email.addLabel("Promotions");
  console.log("Auto-processed promotional email");
}
\`\`\`

### 6. Email close tracking
\`\`\`javascript
// Trigger: email_closed
if (!email.is_read && context.location === "detail") {
  email.markRead();
  console.log("Auto-marked email as read after viewing");
}
\`\`\`

### 7. Smart spam detection
\`\`\`javascript
// Trigger: email_received
const spamIndicators = [
  utils.contains(email.subject, "URGENT"),
  utils.contains(email.subject, "!!!"),
  utils.contains(email.body, "click here now"),
  utils.contains(email.sender, "noreply@suspicious")
];

const spamScore = spamIndicators.filter(Boolean).length;
if (spamScore >= 2) {
  email.moveToSpam();
  console.log("Auto-moved suspicious email to spam");
}
\`\`\`

### 8. Weekend email handling
\`\`\`javascript
// Trigger: email_received
if (context.isWeekend()) {
  email.addLabel("Weekend");
  if (!utils.contains(email.subject, "urgent")) {
    // Mark non-urgent weekend emails for Monday review
    email.addLabel("Monday Review");
  }
}
\`\`\`

## Best Practices

1. **Always check conditions before taking actions**
   - Use \`if\` statements to ensure actions are only taken when appropriate
   
2. **Use descriptive console.log messages**
   - Help users understand what the workflow did
   
3. **Combine multiple conditions for accuracy**
   - Use \`&&\` and \`||\` operators to create precise rules
   
4. **Consider context information**
   - Use time, location, and user context for smarter automation
   
5. **Handle edge cases**
   - Check for empty strings, null values, etc.

## Common Patterns

### Sender-based rules:
\`\`\`javascript
if (email.sender === "specific@email.com") {
  // Take action
}
\`\`\`

### Subject pattern matching:
\`\`\`javascript
if (utils.contains(email.subject, "pattern")) {
  // Take action
}
\`\`\`

### Label-based conditions:
\`\`\`javascript
if (utils.hasAny(email.labels, ["Important", "Urgent"])) {
  // Take action
}
\`\`\`

### Time-based conditions:
\`\`\`javascript
if (context.isBusinessHours() && !context.isWeekend()) {
  // Business hours action
}
\`\`\`

### Multiple condition combinations:
\`\`\`javascript
if (utils.contains(email.sender, "@company.com") && 
    utils.contains(email.subject, "meeting") &&
    context.isBusinessHours()) {
  email.star();
  email.addLabel("Meeting");
}
\`\`\`
`;

/**
 * Get the workflow API documentation for LLM context
 */
export function getWorkflowAPIDocumentation(): string {
  return WORKFLOW_API_DOCUMENTATION;
}

/**
 * Get current workflow context for LLM (list of existing workflows)
 */
export function getCurrentWorkflowContext(workflows: Array<{id: string, description: string, trigger: string}>): string {
  if (workflows.length === 0) {
    return "No existing workflows are currently installed.";
  }

  let context = "Current installed workflows:\n";
  workflows.forEach((workflow, index) => {
    context += `${index + 1}. ${workflow.description} (trigger: ${workflow.trigger})\n`;
  });
  
  context += "\nWhen suggesting new workflows, avoid duplicating existing functionality.";
  return context;
}
