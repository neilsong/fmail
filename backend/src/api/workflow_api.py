from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Set
from datetime import datetime
from enum import Enum
import json
import uuid
import os
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
    pattern_data: Dict[str, Any]
    created_at: datetime

class SuggestionResponse(BaseModel):
    accepted: bool
    suggestion_id: str

# In-memory storage for hackathon
action_logs: Dict[str, List[UserAction]] = {}  # user_id -> actions
hook_functions: Dict[str, List[Dict]] = {}  # user_id -> hooks
suggestions_cache: Dict[str, WorkflowSuggestion] = {}  # suggestion_id -> suggestion
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

    def disconnect(self, user_id: str, session_id: str):
        connection_key = f"{user_id}:{session_id}"
        if connection_key in self.active_connections:
            del self.active_connections[connection_key]
        
        if user_id in self.user_sessions:
            self.user_sessions[user_id].discard(session_id)
            if not self.user_sessions[user_id]:
                del self.user_sessions[user_id]

    async def send_suggestion(self, user_id: str, suggestion: WorkflowSuggestion):
        if user_id in self.user_sessions:
            message = {
                "type": "workflow_suggestion",
                "data": suggestion.dict()
            }
            
            # Send to all active sessions for this user
            for session_id in self.user_sessions[user_id]:
                connection_key = f"{user_id}:{session_id}"
                if connection_key in self.active_connections:
                    websocket = self.active_connections[connection_key]
                    try:
                        await websocket.send_text(json.dumps(message, default=str))
                    except:
                        # Connection closed, clean up
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
    """Simple criteria to decide when to call LLM for analysis"""
    recent_actions = get_user_actions(user_id, 10)
    
    # Only analyze if user has performed at least 3 actions
    if len(recent_actions) < 3:
        return False
    
    # Check for repetitive patterns (same action on similar emails)
    same_action_count = sum(1 for a in recent_actions[-5:] if a.action == current_action.action)
    
    # Analyze if user has done the same action 3+ times recently
    return same_action_count >= 3

async def analyze_action_patterns_with_llm(user_id: str, current_action: UserAction):
    """Use LLM to analyze user action patterns and suggest automations"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or OpenAI is None:
        return await analyze_action_patterns_fallback(user_id, current_action)
    
    try:
        client = OpenAI(api_key=api_key)
        actions = get_user_actions(user_id, limit=20)
        
        # Prepare action history for LLM
        action_history = []
        for action in actions[-10:]:  # Last 10 actions for context
            action_history.append({
                "action": action.action,
                "sender": action.email.get('sender', ''),
                "subject": action.email.get('subject', ''),
                "location": action.context.get('location', 'unknown'),
                "timestamp": action.timestamp.isoformat()
            })
        
        current_action_data = {
            "action": current_action.action,
            "sender": current_action.email.get('sender', ''),
            "subject": current_action.email.get('subject', ''),
            "location": current_action.context.get('location', 'unknown')
        }
        
        system_prompt = """
You are an email automation assistant. Analyze user email actions to detect patterns and suggest automations.

Return JSON with:
- "should_suggest": boolean (true if pattern detected)
- "description": string (user-friendly suggestion like "Auto-archive emails from this sender?")
- "confidence": float 0-1
- "reasoning": string (why this pattern was detected)
- "hook_function": string (Python function code using email.archive(), email.delete(), etc.)
- "pattern_type": string ("sender_based", "subject_based", "location_based", etc.)

Look for patterns like:
- Same action on emails from same sender (3+ times)
- Actions that differ by location (home vs detail page)
- Subject-based patterns (newsletters, notifications)
- Sequential action patterns
"""
        
        user_prompt = {
            "current_action": current_action_data,
            "recent_actions": action_history,
            "context": "User just performed an action, analyze if automation should be suggested"
        }
        
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_prompt)}
            ],
            temperature=0.3
        )
        
        result = json.loads(completion.choices[0].message.content)
        
        if result.get("should_suggest", False):
            suggestion = WorkflowSuggestion(
                id=str(uuid.uuid4()),
                description=result.get("description", "Automation suggestion"),
                confidence=result.get("confidence", 0.5),
                reasoning=result.get("reasoning", "Pattern detected"),
                generated_function=result.get("hook_function", ""),
                pattern_data={
                    "pattern_type": result.get("pattern_type", "unknown"),
                    "current_action": current_action_data,
                    "analysis_result": result
                },
                created_at=datetime.now()
            )
            
            suggestions_cache[suggestion.id] = suggestion
            return suggestion
            
    except Exception as e:
        print(f"LLM analysis failed: {e}")
        return await analyze_action_patterns_fallback(user_id, current_action)
    
    return None

async def analyze_action_patterns_fallback(user_id: str, current_action: UserAction):
    actions = get_user_actions(user_id, limit=50)
    
    # Simple pattern: same action on emails from same sender
    same_sender_actions = [
        a for a in actions 
        if a.email.get('sender') == current_action.email.get('sender')
        and a.action == current_action.action
    ]
    
    if len(same_sender_actions) >= 3:  # Including current action
        suggestion = WorkflowSuggestion(
            id=str(uuid.uuid4()),
            description=f"Auto-{current_action.action.value} emails from {current_action.email.get('sender', 'this sender')}?",
            confidence=0.8,
            reasoning=f"You've {current_action.action.value}d {len(same_sender_actions)} emails from this sender",
            generated_function=f"""
@hook("email_received")
async def auto_{current_action.action.value}_{current_action.email.get('sender', 'sender').replace('@', '_at_').replace('.', '_')}(email: Email, context: Context):
    if email.sender == "{current_action.email.get('sender')}":
        await email.{current_action.action.value}()
""",
            pattern_data={
                "sender": current_action.email.get('sender'),
                "action": current_action.action.value,
                "occurrences": len(same_sender_actions)
            },
            created_at=datetime.now()
        )
        
        suggestions_cache[suggestion.id] = suggestion
        return suggestion
    
    return None

def store_accepted_suggestion(user_id: str, suggestion: WorkflowSuggestion):
    """Store accepted suggestion as a hook function"""
    if user_id not in hook_functions:
        hook_functions[user_id] = []
    
    hook = {
        "id": str(uuid.uuid4()),
        "name": f"auto_{suggestion.pattern_data.get('action', 'action')}_{len(hook_functions[user_id])}",
        "description": suggestion.description,
        "function_code": suggestion.generated_function,
        "enabled": True,
        "created_at": datetime.now(),
        "pattern_data": suggestion.pattern_data
    }
    
    hook_functions[user_id].append(hook)

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
                
                # Check if we should analyze for patterns
                if should_analyze_for_patterns(user_id, action):
                    suggestion = await analyze_action_patterns_with_llm(user_id, action)
                    if suggestion:
                        print(f"Generated suggestion: {suggestion.description}")
                        await manager.send_suggestion(user_id, suggestion)
            
            elif message["type"] == "suggestion_response":
                # Handle user's response to suggestion
                response_data = message["data"]
                suggestion_id = response_data["suggestion_id"]
                accepted = response_data["accepted"]
                
                if accepted and suggestion_id in suggestions_cache:
                    suggestion = suggestions_cache[suggestion_id]
                    store_accepted_suggestion(user_id, suggestion)
                    print(f"Stored hook function for user {user_id}")
                    
                    # Send confirmation
                    confirmation = {
                        "type": "suggestion_accepted",
                        "data": {"message": "Automation rule created!"}
                    }
                    
                    connection_key = f"{user_id}:{session_id}"
                    if connection_key in manager.active_connections:
                        await manager.active_connections[connection_key].send_text(
                            json.dumps(confirmation)
                        )
                
                # Clean up suggestion from cache
                if suggestion_id in suggestions_cache:
                    del suggestions_cache[suggestion_id]
    
    except WebSocketDisconnect:
        manager.disconnect(user_id, session_id)
        print(f"User {user_id} session {session_id} disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(user_id, session_id)

# REST Endpoints for debugging/management
@router.get("/api/actions/{user_id}")
async def get_actions(user_id: str):
    """Get user's action history"""
    return get_user_actions(user_id, 50)

@router.get("/api/hooks/{user_id}")
async def get_hooks(user_id: str):
    """Get user's hook functions"""
    return hook_functions.get(user_id, [])

@router.get("/api/stats")
async def get_stats():
    """Get system stats"""
    return {
        "total_users": len(action_logs),
        "total_actions": sum(len(actions) for actions in action_logs.values()),
        "total_hooks": sum(len(hooks) for hooks in hook_functions.values()),
        "active_connections": len(manager.active_connections)
    }
