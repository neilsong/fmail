from fastapi import APIRouter, Body
from fastapi import Body
import os
import json
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime
import hashlib

# Global state for tracking email diffs and user preferences
email_diffs_store: Dict[str, Dict[str, Any]] = {}  # recipient_hash -> diff_data
generated_emails_store: Dict[str, Dict[str, Any]] = {}  # email_id -> generated_content

def get_recipient_hash(recipient: str) -> str:
    """Create a hash for the recipient to use as a key"""
    return hashlib.md5(recipient.lower().encode()).hexdigest()

def store_generated_email(email_id: str, generated_content: Dict[str, Any]):
    """Store a generated email for later comparison"""
    generated_emails_store[email_id] = {
        "generated": generated_content,
        "timestamp": datetime.now().isoformat()
    }

def analyze_email_diffs(recipient: str, generated_content: Dict[str, Any], final_content: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze differences between generated and final email content"""
    recipient_hash = get_recipient_hash(recipient)
    
    # Simple diff analysis (in production, you'd use a more sophisticated LLM call)
    diff_analysis = {
        "recipient": recipient,
        "timestamp": datetime.now().isoformat(),
        "changes": {},
        "preferences": []
    }
    
    # Analyze subject changes
    if generated_content.get("subject") != final_content.get("subject"):
        diff_analysis["changes"]["subject"] = {
            "from": generated_content.get("subject"),
            "to": final_content.get("subject")
        }
    
    # Analyze body changes
    generated_body = generated_content.get("body", "")
    final_body = final_content.get("body", "")
    
    if generated_body != final_body:
        # Simple text analysis
        generated_words = len(generated_body.split())
        final_words = len(final_body.split())
        
        if final_words > generated_words * 1.5:
            diff_analysis["preferences"].append("Prefers longer, more detailed emails")
        elif final_words < generated_words * 0.7:
            diff_analysis["preferences"].append("Prefers concise, brief emails")
        
        # Check for formal language patterns
        if any(word in final_body.lower() for word in ["sincerely", "respectfully", "best regards"]):
            diff_analysis["preferences"].append("Prefers formal closing")
        
        # Check for bullet points
        if "- " in final_body or "• " in final_body:
            diff_analysis["preferences"].append("Prefers bullet points in emails")
        else:
            diff_analysis["preferences"].append("Prefers paragraph format over bullet points")
    
    # Store the analysis
    if recipient_hash not in email_diffs_store:
        email_diffs_store[recipient_hash] = {
            "recipient": recipient,
            "analyses": [],
            "preferences": set()
        }
    
    email_diffs_store[recipient_hash]["analyses"].append(diff_analysis)
    
    # Update preferences
    for pref in diff_analysis["preferences"]:
        email_diffs_store[recipient_hash]["preferences"].add(pref)
    
    return diff_analysis

def get_user_preferences(recipient: str) -> List[str]:
    """Get learned preferences for a specific recipient"""
    recipient_hash = get_recipient_hash(recipient)
    if recipient_hash in email_diffs_store:
        return list(email_diffs_store[recipient_hash]["preferences"])
    return []

try:
    from openai import OpenAI
except Exception:
    OpenAI = None  # Library may not be installed yet; handled at runtime

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None  # Optional; if missing, we simply skip explicit loading

router = APIRouter()

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


def _fallback_generate_email(
    bullets,
    tone,
    recipient,
    subject,
):
    subject_seed = subject or (bullets[0] if bullets else "Follow-up")
    subject = f"{subject_seed}"
    greeting = f"Hi {recipient}," if recipient else "Hello,"
    body_lines = [greeting, "", "I wanted to share a quick summary:"]
    for bullet in bullets:
        body_lines.append(f"- {bullet}")
    if tone and tone != "neutral":
        body_lines.append("")
        body_lines.append(f"Tone requested: {tone}")
    body_lines.append("")
    body_lines.append("Best regards,\nYour Name")
    return {"recipient": recipient, "subject": subject, "body": "\n".join(body_lines)}


async def _generate_email_with_openai(payload):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or OpenAI is None:
        return _fallback_generate_email(
            payload.get("bullets", []), payload.get("tone", "neutral"), payload.get("recipient"), payload.get("subject")
        )

    client = OpenAI(api_key=api_key)
    
    # Get learned preferences for this recipient
    recipient = payload.get("recipient", "")
    learned_preferences = get_user_preferences(recipient)
    
    # Build system prompt with learned preferences
    system_base = (
        "You are an assistant that turns bullet points into a polished, concise, professional email. "
        "Return JSON with keys 'recipient', 'subject' and 'body'. Keep the email clear and readable. Dont use bullet points."
        "Pretend you are hilary clinton so title each email from Hilary Clinton"
    )
    
    if learned_preferences:
        preferences_text = "\n\nLearned user preferences for this recipient:\n" + "\n".join(f"- {pref}" for pref in learned_preferences)
        system_prompt = system_base + preferences_text
    else:
        system_prompt = system_base

    user_instructions = {
        "bullets": payload.get("bullets", []),
        "tone": payload.get("tone", "neutral"),
        "recipient": payload.get("recipient"),
        "subject": payload.get("subject"),
        "requirements": [
            "Subject should be short and informative",
            "Body should be a few short paragraphs or a brief intro and a list",
            "Close politely",
        ],
    }
    
    if learned_preferences:
        user_instructions["learned_preferences"] = learned_preferences

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_instructions)},
            ],
            temperature=0.7,
        )
        content = completion.choices[0].message.content
        data = json.loads(content)
        subject = data.get("subject") or (
            payload.get("subject") or (payload.get("bullets", [])[0] if payload.get("bullets") else "")
        )
        body = data.get("body") or _fallback_generate_email(
            payload.get("bullets", []), payload.get("tone", "neutral"), payload.get("recipient"), payload.get("subject")
        )["body"]
        return {
            "recipient": payload.get("recipient"),
            "subject": subject,
            "body": body
        }
    except Exception:
        # Fallback on any error (network, model, or formatting)
        return _fallback_generate_email(
            payload.get("bullets", []), payload.get("tone", "neutral"), payload.get("recipient"), payload.get("subject")
        )


@router.post("/api/generate-email")
async def generate_email(payload: dict = Body(...)):
    return await _generate_email_with_openai(payload)

# Email diff tracking endpoints
@router.post("/api/store-generated-email")
async def store_generated_email_endpoint(request: dict = Body(...)):
    """Store a generated email for later diff analysis"""
    email_id = request.get("email_id")
    generated_content = request.get("generated_content")
    store_generated_email(email_id, generated_content)
    return {"message": "Generated email stored successfully", "email_id": email_id}

@router.post("/api/analyze-email-diff")
async def analyze_email_diff_endpoint(request: dict = Body(...)):
    """Analyze differences between generated and final email content"""
    recipient = request.get("recipient")
    generated_content = request.get("generated_content")
    final_content = request.get("final_content")
    analysis = analyze_email_diffs(recipient, generated_content, final_content)
    return analysis

@router.get("/api/user-preferences/{recipient}")
async def get_user_preferences_endpoint(recipient: str):
    """Get learned preferences for a specific recipient"""
    preferences = get_user_preferences(recipient)
    return {"recipient": recipient, "preferences": preferences}

@router.get("/api/email-diffs")
async def get_all_email_diffs():
    """Get all stored email diff data (for debugging/admin)"""
    return email_diffs_store 