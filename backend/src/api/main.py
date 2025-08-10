from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
import json

app = FastAPI(
    title="FMail Backend API",
    description="FastAPI backend for FMail application",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # Vite dev server ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class Message(BaseModel):
    id: Optional[int] = None
    subject: str
    body: str
    sender: str
    recipient: str
    timestamp: Optional[datetime] = None
    read: bool = False

class User(BaseModel):
    id: Optional[int] = None
    email: str
    name: str

# In-memory storage (for demo purposes)
messages_db: List[Message] = []
users_db: List[User] = []
message_counter = 0
user_counter = 0

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to FMail Backend API",
        "status": "online",
        "version": "1.0.0"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

# Message endpoints
@app.get("/api/messages", response_model=List[Message])
async def get_messages():
    """Get all messages"""
    return messages_db

@app.get("/api/messages/{message_id}", response_model=Message)
async def get_message(message_id: int):
    """Get a specific message by ID"""
    for message in messages_db:
        if message.id == message_id:
            return message
    raise HTTPException(status_code=404, detail="Message not found")

@app.post("/api/messages", response_model=Message)
async def create_message(message: Message):
    """Create a new message"""
    global message_counter
    message_counter += 1
    message.id = message_counter
    message.timestamp = datetime.now()
    messages_db.append(message)
    return message

@app.put("/api/messages/{message_id}", response_model=Message)
async def update_message(message_id: int, updated_message: Message):
    """Update an existing message"""
    for i, message in enumerate(messages_db):
        if message.id == message_id:
            updated_message.id = message_id
            updated_message.timestamp = message.timestamp
            messages_db[i] = updated_message
            return updated_message
    raise HTTPException(status_code=404, detail="Message not found")

@app.delete("/api/messages/{message_id}")
async def delete_message(message_id: int):
    """Delete a message"""
    for i, message in enumerate(messages_db):
        if message.id == message_id:
            del messages_db[i]
            return {"message": "Message deleted successfully"}
    raise HTTPException(status_code=404, detail="Message not found")

# User endpoints
@app.get("/api/users", response_model=List[User])
async def get_users():
    """Get all users"""
    return users_db

@app.post("/api/users", response_model=User)
async def create_user(user: User):
    """Create a new user"""
    global user_counter
    user_counter += 1
    user.id = user_counter
    users_db.append(user)
    return user

@app.get("/api/users/{user_id}", response_model=User)
async def get_user(user_id: int):
    """Get a specific user by ID"""
    for user in users_db:
        if user.id == user_id:
            return user
    raise HTTPException(status_code=404, detail="User not found")

# Hillary emails endpoint
@app.get("/api/hillary-emails")
async def get_hillary_emails():
    """Get Hillary Clinton emails from the JSON file"""
    try:
        # Path to the Hillary emails JSON file
        hillary_emails_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "hillary_emails_only.json")
        
        if not os.path.exists(hillary_emails_path):
            raise HTTPException(status_code=404, detail="Hillary emails file not found")
        
        with open(hillary_emails_path, 'r', encoding='utf-8') as f:
            hillary_emails = json.load(f)
        
        return hillary_emails
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading Hillary emails: {str(e)}")



@app.get("/api/hillary-received-emails")
async def get_hillary_received_emails():
    """Get Hillary Clinton's received emails from the JSON file"""
    try:
        # Path to the Hillary received emails JSON file
        hillary_received_emails_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "hillary_emails_received.json")
        
        if not os.path.exists(hillary_received_emails_path):
            raise HTTPException(status_code=404, detail="Hillary received emails file not found")
        
        with open(hillary_received_emails_path, 'r', encoding='utf-8') as f:
            hillary_received_emails = json.load(f)
        
        return hillary_received_emails
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading Hillary received emails: {str(e)}")



# Include LLM-powered email endpoint router
from .llm_api import router as llm_router  # noqa: E402
from .workflow_api import router as workflow_router  # noqa: E402
app.include_router(llm_router)
app.include_router(workflow_router)

# Statistics endpoint
@app.get("/api/stats")
async def get_stats():
    """Get application statistics"""
    unread_count = sum(1 for msg in messages_db if not msg.read)
    return {
        "total_messages": len(messages_db),
        "unread_messages": unread_count,
        "total_users": len(users_db),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)