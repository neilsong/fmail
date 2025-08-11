from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Set, Callable
from datetime import datetime
from enum import Enum
import json
import uuid
import os
import asyncio
import inspect
from pathlib import Path

try:
    from openai import OpenAI
except Exception:
    OpenAI = None

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

router = APIRouter()

# Load environment variables
def _load_env_local() -> None:
    if load_dotenv is None:
        return
    current_file = Path(__file__).resolve()
    backend_dir = current_file.parents[2]  # .../backend
    repo_root = current_file.parents[3]    # project root
    candidates = [
        backend_dir / ".env.local",
        repo_root / ".env.local",
        Path.cwd() / ".env.local",
    ]
    for path in candidates:
        if path.exists():
            load_dotenv(path, override=False)
            break

_load_env_local()

# Data Models
class ActionType(str, Enum):
    ARCHIVE = "archive"
    DELETE = "delete"
    LABEL = "label"
    STAR = "star"
    UNSTAR = "unstar"
    OPEN = "open"
    CLOSE = "close"
    MARK_READ = "mark_read"
    MARK_UNREAD = "mark_unread"

class UserAction(BaseModel):
    id: Optional[str] = None
    action: ActionType
    timestamp: datetime
    email: Dict[str, Any]  # {id, sender, subject, labels}
    user_id: str
    session_id: str
    context: Dict[str, Any]  # {location: 'home'|'detail', previousActions: []}
    duration: Optional[int] = None

class WorkflowSuggestion(BaseModel):
    id: str
    description: str
    confidence: float
    reasoning: str
    generated_function: str
    trigger_event: str
    created_at: datetime

class SuggestionResponse(BaseModel):
    accepted: bool
    suggestion_id: str

# In-memory storage for hackathon
action_logs: Dict[str, List[UserAction]] = {}  # user_id -> actions
hook_functions: Dict[str, List[Dict]] = {}  # user_id -> hooks
suggestions_cache: Dict[str, WorkflowSuggestion] = {}  # suggestion_id -> suggestion
user_workflows: Dict[str, List[Dict]] = {}  # user_id -> current workflows for LLM context

# Debouncing for LLM requests
pending_analysis_tasks: Dict[str, asyncio.Task] = {}  # user_id -> analysis task
analysis_debounce_delay = 1.0  # 1 second debounce delay


class Context:
    """Context object available in workflow functions"""
    def __init__(self, context_data: Dict[str, Any]):
        self.user_id = context_data.get('user_id', '')
        self.location = context_data.get('location', 'unknown')
        self.time_of_day = datetime.now().hour
        self.day_of_week = datetime.now().weekday()
        self.session_id = context_data.get('session_id', '')

class LLMHelpers:
    """LLM helper functions available in workflow functions"""
    
    @staticmethod
    async def classify(text: str, categories: List[str]) -> str:
        """Classify text into one of the given categories"""
        # Simple keyword-based classification for demo
        text_lower = text.lower()
        
        # Newsletter detection
        if 'newsletter' in categories:
            newsletter_keywords = ['newsletter', 'unsubscribe', 'weekly', 'monthly', 'digest']
            if any(keyword in text_lower for keyword in newsletter_keywords):
                return 'newsletter'
        
        # Promotion detection
        if 'promotion' in categories:
            promo_keywords = ['sale', 'discount', 'offer', 'deal', 'promo', '%', 'save']
            if any(keyword in text_lower for keyword in promo_keywords):
                return 'promotion'
        
        # Default to first category
        return categories[0] if categories else 'unknown'
    
    @staticmethod
    async def extract(text: str, schema: Dict[str, str]) -> Dict[str, Any]:
        """Extract structured data from text"""
        # Simple extraction for demo
        result = {}
        text_lower = text.lower()
        
        for field, field_type in schema.items():
            if field_type == 'email':
                # Simple email extraction
                import re
                emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
                result[field] = emails[0] if emails else None
            elif field_type == 'date':
                # Simple date extraction (placeholder)
                result[field] = datetime.now().isoformat()
            else:
                result[field] = None
        
        return result
    
    @staticmethod
    async def decide(question: str, context: str) -> bool:
        """Make binary decisions"""
        # Simple decision logic for demo
        question_lower = question.lower()
        context_lower = context.lower()
        
        # Simple heuristics
        if 'important' in question_lower and 'urgent' in context_lower:
            return True
        if 'spam' in question_lower and ('unsubscribe' in context_lower or 'promotion' in context_lower):
            return True
        
        return False
    
    @staticmethod
    async def summarize(text: str, max_length: int = 100) -> str:
        """Summarize text content"""
        # Simple summarization for demo
        if len(text) <= max_length:
            return text
        return text[:max_length-3] + '...'
    
    @staticmethod
    async def match_pattern(text: str, patterns: List[str]) -> Optional[str]:
        """Match against learned patterns"""
        text_lower = text.lower()
        for pattern in patterns:
            if pattern.lower() in text_lower:
                return pattern
        return None

# Global LLM helpers instance
llm = LLMHelpers()
user_sessions: Dict[str, List[str]] = {}  # user_id -> recent actions for context

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_sessions: Dict[str, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str, session_id: str):
        await websocket.accept()
        connection_key = f"{user_id}:{session_id}"
        self.active_connections[connection_key] = websocket
        
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = set()
        self.user_sessions[user_id].add(session_id)
        
        print(f"User {user_id} session {session_id} connected")
    
    def disconnect(self, user_id: str, session_id: str):
        connection_key = f"{user_id}:{session_id}"
        if connection_key in self.active_connections:
            del self.active_connections[connection_key]
        
        if user_id in self.user_sessions:
            self.user_sessions[user_id].discard(session_id)
            if not self.user_sessions[user_id]:
                del self.user_sessions[user_id]
        
        print(f"User {user_id} session {session_id} disconnected")
    
    async def send_suggestion(self, user_id: str, suggestion: WorkflowSuggestion):
        """Send workflow suggestion to all user sessions"""
        if user_id not in self.user_sessions:
            return
        
        message = {
            "type": "workflow_suggestion",
            "data": {
                "id": suggestion.id,
                "description": suggestion.description,
                "confidence": suggestion.confidence,
                "reasoning": suggestion.reasoning,
                "generated_function": suggestion.generated_function,
                "trigger_event": suggestion.trigger_event
            }
        }
        
        for session_id in self.user_sessions[user_id].copy():
            connection_key = f"{user_id}:{session_id}"
            if connection_key in self.active_connections:
                try:
                    await self.active_connections[connection_key].send_text(
                        json.dumps(message)
                    )
                except Exception as e:
                    print(f"Failed to send suggestion to {connection_key}: {e}")
                    self.disconnect(user_id, session_id)
    
    async def send_workflow_notification(self, user_id: str, notification: Dict[str, Any]):
        """Send workflow execution notification to all user sessions"""
        if user_id not in self.user_sessions:
            return
        
        message = {
            "type": "workflow_notification",
            "data": notification
        }
        
        for session_id in self.user_sessions[user_id].copy():
            connection_key = f"{user_id}:{session_id}"
            if connection_key in self.active_connections:
                try:
                    await self.active_connections[connection_key].send_text(
                        json.dumps(message)
                    )
                except Exception as e:
                    print(f"Failed to send workflow notification to {connection_key}: {e}")
                    self.disconnect(user_id, session_id)

manager = ConnectionManager()

# Helper Functions
def store_user_action(action: UserAction) -> str:
    """Store user action in memory"""
    action.id = str(uuid.uuid4())
    
    if action.user_id not in action_logs:
        action_logs[action.user_id] = []
    
    action_logs[action.user_id].append(action)
    
    # Keep only last 100 actions per user for memory efficiency
    if len(action_logs[action.user_id]) > 100:
        action_logs[action.user_id] = action_logs[action.user_id][-100:]
    
    return action.id

def get_user_actions(user_id: str, limit: int = 20) -> List[UserAction]:
    """Get recent user actions"""
    if user_id not in action_logs:
        return []
    
    return action_logs[user_id][-limit:]

def should_analyze_for_patterns(user_id: str, current_action: UserAction) -> bool:
    """Decide when to call LLM for analysis based on intentional actions and sufficient history"""
    recent_actions = get_user_actions(user_id, 20)
    
    # Only analyze if user has performed more than 3 actions total
    if len(recent_actions) <= 3:
        return False
    
    # Define intentional user actions that indicate deliberate email management
    intentional_actions = {
        ActionType.STAR, ActionType.UNSTAR, ActionType.DELETE, 
        ActionType.ARCHIVE, ActionType.LABEL, 
        ActionType.MARK_UNREAD
    }
    
    # Only analyze for intentional actions
    if current_action.action not in intentional_actions:
        return False

    print(f"\n=== PATTERN ANALYSIS CHECK ===")
    print(f"Current action: {current_action.action} on email from {current_action.email.get('sender', 'unknown')}")
    print(f"Total recent actions: {len(recent_actions)}")
    
    # Show recent actions for context
    print(f"Recent actions:")
    for i, action in enumerate(recent_actions[-5:]):
        marker = "👉" if action.action == current_action.action else "  "
        print(f"  {marker} {action.action} on email from {action.email.get('sender', 'unknown')}")
    
    print(f"✅ TRIGGERING LLM ANALYSIS - Intentional action with sufficient history")
    print(f"=== END PATTERN CHECK ===\n")
    return True

# NOTE: Python API documentation removed since workflow execution moved to JavaScript frontend

async def debounced_analyze_patterns(user_id: str, current_action: UserAction) -> None:
    """Debounced wrapper for LLM analysis to prevent overwhelming the LLM with rapid requests"""
    print(f"⏱️ Starting debounced analysis for user {user_id} (delay: {analysis_debounce_delay}s)")
    
    # Wait for debounce delay
    await asyncio.sleep(analysis_debounce_delay)
    
    # Check if this task was cancelled (newer action arrived)
    current_task = asyncio.current_task()
    if user_id in pending_analysis_tasks and pending_analysis_tasks[user_id] != current_task:
        print(f"🚫 Analysis cancelled for user {user_id} - newer action received")
        return
    
    print(f"🔍 Proceeding with LLM analysis for user {user_id}...")
    suggestion = await analyze_action_patterns_with_llm(user_id, current_action)
    
    if suggestion:
        print(f"✨ Generated suggestion: {suggestion.description}")
        print(f"   Confidence: {suggestion.confidence}")
        print(f"   Trigger event: {suggestion.trigger_event}")
        await manager.send_suggestion(user_id, suggestion)
    else:
        print(f"❌ LLM analysis completed but no suggestion generated")
    
    # Clean up task reference
    if user_id in pending_analysis_tasks and pending_analysis_tasks[user_id] == current_task:
        del pending_analysis_tasks[user_id]

async def analyze_action_patterns_with_llm(user_id: str, current_action: UserAction):
    """Use LLM to analyze user action patterns and suggest automations"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or OpenAI is None:
        print(f"⚠️  No OpenAI API key found, falling back to simple analysis")
        return await analyze_action_patterns_fallback(user_id, current_action)
    
    try:
        client = OpenAI(api_key=api_key)
        actions = get_user_actions(user_id, limit=30)  # More context for better analysis
        existing_workflows = hook_functions.get(user_id, [])
        
        # Prepare comprehensive action history for LLM
        action_history = []
        for action in actions[-20:]:  # Last 20 actions for context
            action_history.append({
                "action": action.action,
                "sender": action.email.get('sender', ''),
                "subject": action.email.get('subject', ''),
                "location": action.context.get('location', 'unknown'),
                "timestamp": action.timestamp.isoformat(),
                "labels": action.email.get('labels', []),
                "is_read": action.email.get('is_read', False)
            })
        
        current_action_data = {
            "action": current_action.action,
            "sender": current_action.email.get('sender', ''),
            "subject": current_action.email.get('subject', ''),
            "location": current_action.context.get('location', 'unknown'),
            "labels": current_action.email.get('labels', []),
            "is_read": current_action.email.get('is_read', False)
        }
        
        # Prepare existing workflows to prevent duplicates
        existing_workflow_summaries = []
        for workflow in existing_workflows:
            existing_workflow_summaries.append({
                "description": workflow.get('description', ''),
                "trigger_event": workflow.get('trigger_event', 'email_received')
            })
        
        system_prompt = """
You are an intelligent email automation assistant. Analyze user email actions to detect meaningful patterns and suggest practical automations.

CRITICAL: Generate JavaScript code blocks (NOT function declarations). The frontend executes JavaScript using eval().

JavaScript Email API Available:
- email.id - Email ID (string)
- email.sender - Sender email address (string)  
- email.subject - Email subject (string)
- email.body - Email body content (string)
- email.labels - Array of label strings
- email.is_read - Boolean if email is read
- email.is_starred - Boolean if email is starred
- email.received_at - Date object when received

JavaScript Actions Available:
- email.archive() - Archive the email
- email.delete() - Delete the email
- email.star() - Star the email
- email.unstar() - Remove star
- email.markRead() - Mark as read
- email.markUnread() - Mark as unread
- email.addLabel(labelName) - Add a label
- email.removeLabel(labelName) - Remove a label
- email.moveToSpam() - Move to spam
- email.moveToTrash() - Move to trash

Context API Available:
- context.user_id - User ID (string)
- context.location - Where action occurred ('home', 'detail')
- context.time_of_day - Hour of day (0-23)
- context.day_of_week - Day of week (0-6, 0=Sunday)

IMPORTANT: Generate JavaScript code blocks, NOT function declarations. Examples:

CORRECT format for hook_function:
```
if (email.sender === 'newsletter@example.com') {
  email.archive();
  console.log('Auto-archived newsletter');
}
```

WRONG format (DO NOT USE):
```
function() { ... }
() => { ... }
(function() { ... })
```

Your task:
1. Analyze the user's recent actions to identify clear, actionable patterns
2. Check if similar workflows already exist to avoid duplicates
3. Only suggest automations with high confidence (0.8+) and clear user benefit
4. Generate executable JavaScript code blocks (NOT function declarations)

Return JSON with:
- "should_suggest": boolean (true only if strong pattern detected and no duplicate exists)
- "description": string (clear, actionable suggestion like "Auto-archive newsletters from this sender?")
- "confidence": float 0-1 (only suggest if 0.8+)
- "reasoning": string (detailed explanation of detected pattern)
- "hook_function": string (JavaScript code block - NO function wrapper, just the code)
- "pattern_type": string ("sender_based", "subject_based", "content_based", "time_based", etc.)
- "trigger_event": string ("email_received", "email_closed", "user_action")


Pattern detection criteria:
- Sender-based: Same action on emails from same sender
- Subject-based: Same action on emails with similar subjects (newsletters, notifications)
- Content-based: Same action on emails with similar content patterns
- Time-based: Actions that happen at specific times or days
- Sequential: Multi-step action patterns
- Location-based: Actions that vary by interface location

Only suggest if:
- Clear pattern detected in recent actions
- No similar existing workflow
- Clear user benefit
"""
        
        user_prompt = {
            "current_action": current_action_data,
            "recent_actions": action_history,
            "existing_workflows": existing_workflow_summaries,
            "analysis_request": "Analyze if the current action completes a pattern worthy of automation"
        }
        
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_prompt, indent=2)}
            ],
            temperature=0.2  # Lower temperature for more consistent analysis
        )
        
        result = json.loads(completion.choices[0].message.content)
        
        if result.get("should_suggest", False) and result.get("confidence", 0) >= 0.8:
            suggestion = WorkflowSuggestion(
                id=str(uuid.uuid4()),
                description=result.get("description", "Automation suggestion"),
                confidence=result.get("confidence", 0.8),
                reasoning=result.get("reasoning", "Pattern detected"),
                generated_function=result.get("hook_function", ""),
                trigger_event=result.get("trigger_event", "email_received"),
                created_at=datetime.now()
            )
            
            suggestions_cache[suggestion.id] = suggestion
            return suggestion
            
    except Exception as e:
        print(f"LLM analysis failed: {e}")
    
    return None

def store_accepted_suggestion(user_id: str, suggestion: WorkflowSuggestion):
    """Store accepted suggestion as a hook function"""
    if user_id not in hook_functions:
        hook_functions[user_id] = []
    
    hook = {
        "id": str(uuid.uuid4()),
        "name": f"auto_workflow_{len(hook_functions[user_id])}",
        "description": suggestion.description,
        "function_code": suggestion.generated_function,
        "trigger_event": suggestion.trigger_event,
        "enabled": True,
        "created_at": datetime.now(),
        "execution_count": 0,
        "last_executed": None
    }
    
    hook_functions[user_id].append(hook)
    return hook

async def execute_workflow_hooks(user_id: str, trigger_event: str, email_data: Dict[str, Any], context_data: Dict[str, Any]):
    """Execute all enabled workflow hooks for a given trigger event"""
    if user_id not in hook_functions:
        return []
    
    executed_workflows = []
    
    for hook in hook_functions[user_id]:
        if not hook.get('enabled', True):
            continue
            
        if hook.get('trigger_event', 'email_received') != trigger_event:
            continue
            
        try:
            # Execute the workflow hook
            result = await execute_single_workflow(hook, email_data, context_data)
            if result:
                # Update execution stats
                hook['execution_count'] = hook.get('execution_count', 0) + 1
                hook['last_executed'] = datetime.now()
                
                executed_workflows.append({
                    'hook_id': hook['id'],
                    'description': hook['description'],
                    'result': result,
                    'executed_at': datetime.now()
                })
                
                # Send notification to user
                await manager.send_workflow_notification(user_id, {
                    'type': 'workflow_executed',
                    'hook_id': hook['id'],
                    'description': hook['description'],
                    'result': result,
                    'can_undo': True  # Stub for future undo functionality
                })
                
        except Exception as e:
            print(f"Error executing workflow {hook['id']}: {e}")
            # Send error notification
            await manager.send_workflow_notification(user_id, {
                'type': 'workflow_error',
                'hook_id': hook['id'],
                'description': hook['description'],
                'error': str(e)
            })
    
    return executed_workflows

async def execute_single_workflow(hook: Dict[str, Any], email_data: Dict[str, Any], context_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Execute a single workflow function using real Python code execution"""
    try:
        # Create runtime objects
        email = Email(email_data)
        context = Context(context_data)
        
        # Get the generated function code
        function_code = hook.get('function_code', '')
        if not function_code:
            return None
        
        # Create execution namespace with available objects
        namespace = {
            'email': email,
            'context': context,
            'llm': llm,
            'hook': lambda event_type: lambda func: func,  # Decorator that just returns the function
            'Email': Email,
            'Context': Context,
            'datetime': datetime,
            'asyncio': asyncio
        }
        
        # Execute the function code to define it
        exec(function_code, namespace)
        
        # Find the workflow function (should be the only async function defined)
        workflow_func = None
        for name, obj in namespace.items():
            if (callable(obj) and 
                not name.startswith('_') and 
                name not in ['email', 'context', 'llm', 'hook', 'Email', 'Context', 'datetime', 'asyncio'] and
                inspect.iscoroutinefunction(obj)):
                workflow_func = obj
                break
        
        if workflow_func is None:
            print(f"No workflow function found in generated code")
            return None
        
        # Execute the workflow function
        result = await workflow_func(email, context)
        
        # Return execution results
        execution_result = {
            'function_executed': workflow_func.__name__,
            'actions_taken': email._actions_taken,
            'result': result,
            'email_id': email.id
        }
        
        return execution_result
        
    except Exception as e:
        print(f"Error executing workflow function: {e}")
        print(f"Function code was: {hook.get('function_code', 'N/A')}")
        return {
            'error': str(e),
            'function_code': hook.get('function_code', ''),
            'email_id': email_data.get('id', 'unknown')
        }

# WebSocket Endpoint
@router.websocket("/ws/{user_id}/{session_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, session_id: str):
    await manager.connect(websocket, user_id, session_id)
    
    try:
        while True:
            # Receive message from frontend
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "user_action":
                # Process user action
                action_data = message["data"]
                action_data["user_id"] = user_id
                action_data["session_id"] = session_id
                action_data["timestamp"] = datetime.now()
                
                action = UserAction(**action_data)
                action_id = store_user_action(action)
                
                print(f"Stored action {action_id}: {action.action} on email from {action.email.get('sender')}")
                
                # Check if we should analyze for patterns with debouncing
                if should_analyze_for_patterns(user_id, action):
                    # Cancel any existing analysis task for this user
                    if user_id in pending_analysis_tasks:
                        pending_analysis_tasks[user_id].cancel()
                        print(f"🚫 Cancelled previous analysis task for user {user_id}")
                    
                    # Start new debounced analysis task
                    print(f"⏱️ Scheduling debounced LLM analysis for user {user_id}...")
                    task = asyncio.create_task(debounced_analyze_patterns(user_id, action))
                    pending_analysis_tasks[user_id] = task
            
            elif message["type"] == "suggestion_response":
                # Handle user's response to suggestion
                response_data = message["data"]
                suggestion_id = response_data["suggestion_id"]
                accepted = response_data["accepted"]
                
                if accepted and suggestion_id in suggestions_cache:
                    suggestion = suggestions_cache[suggestion_id]
                    hook = store_accepted_suggestion(user_id, suggestion)
                    print(f"Stored hook function {hook['id']} for user {user_id}")
                    
                    # Send confirmation with hook details
                    confirmation = {
                        "type": "suggestion_accepted",
                        "data": {
                            "message": "Automation rule created!",
                            "hook_id": hook['id'],
                            "description": hook['description'],
                            "trigger_event": hook['trigger_event']
                        }
                    }
                    
                    connection_key = f"{user_id}:{session_id}"
                    if connection_key in manager.active_connections:
                        await manager.active_connections[connection_key].send_text(
                            json.dumps(confirmation)
                        )
                
                # Clean up suggestion from cache
                if suggestion_id in suggestions_cache:
                    del suggestions_cache[suggestion_id]
            
            elif message["type"] == "email_event":
                # Handle email events that might trigger workflows
                event_data = message["data"]
                trigger_event = event_data.get("event_type", "email_received")
                email_data = event_data.get("email", {})
                context_data = event_data.get("context", {})
                
                # Execute any matching workflow hooks
                executed_workflows = await execute_workflow_hooks(
                    user_id, trigger_event, email_data, context_data
                )
                
                if executed_workflows:
                    print(f"Executed {len(executed_workflows)} workflows for user {user_id}")
    
    except WebSocketDisconnect:
        manager.disconnect(user_id, session_id)
        print(f"User {user_id} session {session_id} disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(user_id, session_id)

# REST Endpoints for debugging/management
@router.get("/actions/{user_id}")
async def get_actions(user_id: str):
    """Get user's action history"""
    actions = get_user_actions(user_id, limit=50)
    return {"actions": [action.dict() for action in actions]}

@router.get("/hooks/{user_id}")
async def get_hooks(user_id: str):
    """Get user's hook functions"""
    return {"hooks": hook_functions.get(user_id, [])}

@router.post("/hooks/{user_id}/{hook_id}/toggle")
async def toggle_hook(user_id: str, hook_id: str):
    """Enable/disable a specific hook"""
    if user_id not in hook_functions:
        return {"error": "User not found"}
    
    for hook in hook_functions[user_id]:
        if hook['id'] == hook_id:
            hook['enabled'] = not hook.get('enabled', True)
            return {
                "success": True,
                "hook_id": hook_id,
                "enabled": hook['enabled']
            }
    
    return {"error": "Hook not found"}

@router.delete("/hooks/{user_id}/{hook_id}")
async def delete_hook(user_id: str, hook_id: str):
    """Delete a specific hook"""
    if user_id not in hook_functions:
        return {"error": "User not found"}
    
    hook_functions[user_id] = [
        hook for hook in hook_functions[user_id]
        if hook['id'] != hook_id
    ]
    
    return {"success": True, "deleted_hook_id": hook_id}

@router.get("/stats")
async def get_stats():
    """Get system stats"""
    total_executions = sum(
        sum(hook.get('execution_count', 0) for hook in hooks)
        for hooks in hook_functions.values()
    )
    
    return {
        "total_users": len(action_logs),
        "total_actions": sum(len(actions) for actions in action_logs.values()),
        "total_hooks": sum(len(hooks) for hooks in hook_functions.values()),
        "total_executions": total_executions,
        "active_connections": len(manager.active_connections),
        "suggestions_pending": len(suggestions_cache)
    }
