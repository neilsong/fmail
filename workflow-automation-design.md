# Email Workflow Automation

## Overview
Track user email actions, use LLM to detect patterns, suggest Python hook functions for automation.

**Core Principle**: LLM analyzes action history to suggest automations when behavioral patterns emerge.

## Action Tracking
```typescript
interface UserAction {
  action: 'archive' | 'delete' | 'label' | 'star' | 'open' | 'close';
  timestamp: number;
  email: { id: string; sender: string; subject: string; labels: [labels]; };
  user_id: string;
}
```

## Hook Functions
LLM-generated Python functions that execute on email events:

```python
@hook("email_received")
async def auto_archive_newsletters(email: Email, context: Context):
    is_newsletter = await llm.classify(
        "Is this a newsletter?",
        {"sender": email.sender, "subject": email.subject, "labels": email.labels}
    )
    if is_newsletter.confidence > 0.8:
        await email.archive()
```

**Available Hooks**: `email_received`, `email_opened`, `email_closed`, `email_archived`, `email_deleted`, `label_added`, `email_starred`

**LLM Primitives**: `llm.classify()`, `llm.categorize()`, `llm.decide()`, `llm.extract()`

## API Flow

```typescript
// Frontend: Track action + check for suggestions
const trackAction = async (action: UserAction) => {
  await fetch('/api/actions/track', { method: 'POST', body: JSON.stringify(action) });
  
  const suggestion = await fetch('/api/workflows/suggest', { 
    method: 'POST', 
    body: JSON.stringify({ action, userId: currentUser.id }) 
  });
  
  if (suggestion.shouldSuggest) showSuggestionToast(suggestion);
};
```

**Key Endpoints**:
- `POST /api/actions/track` - Store user action
- `POST /api/workflows/suggest` - LLM analyzes patterns, returns suggestions  
- `POST /api/hooks/register` - Install accepted hook function
- `GET /api/rules` - List user's automation rules

## User Journey
1. User performs email actions → tracked
2. LLM analyzes action history → detects patterns
3. Suggestion shown: "Auto-archive emails from this sender?"
4. User accepts → hook function installed and runs automatically