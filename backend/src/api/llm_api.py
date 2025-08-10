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

async def analyze_email_diffs(recipient: str, generated_content: Dict[str, Any], final_content: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze differences between generated and final email content using LLM"""
    recipient_hash = get_recipient_hash(recipient)
    
    # Use LLM to analyze differences
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key and OpenAI is not None:
            client = OpenAI(api_key=api_key)
            
            system_prompt = """You are an expert at analyzing email writing preferences. 
            Compare the original AI-generated email with the user's final edited version.
            Identify the key differences and return a concise analysis of the user's writing preferences.
            Focus on style, tone, structure, and formatting preferences.
            Return your analysis as a simple string, not JSON."""
            
            user_prompt = f"""Please analyze the differences between these two emails and identify the user's writing preferences:

ORIGINAL AI-GENERATED EMAIL:
Subject: {generated_content.get('subject', '')}
Body: {generated_content.get('body', '')}

USER'S FINAL EDITED EMAIL:
Subject: {final_content.get('subject', '')}
Body: {final_content.get('body', '')}

What are the key differences that reveal this user's writing preferences? Focus on style, tone, structure, and formatting."""

            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=200
            )
            
            llm_analysis = completion.choices[0].message.content
        else:
            # Fallback to simple analysis if LLM not available
            llm_analysis = "LLM analysis not available - using fallback"
    except Exception as e:
        print(f"LLM analysis failed: {e}")
        llm_analysis = "LLM analysis failed - using fallback"
    
    diff_analysis = {
        "recipient": recipient,
        "timestamp": datetime.now().isoformat(),
        "llm_analysis": llm_analysis,
        "preferences": []
    }
    
    # Store the analysis
    if recipient_hash not in email_diffs_store:
        email_diffs_store[recipient_hash] = {
            "recipient": recipient,
            "analyses": [],
            "preferences": set()
        }
    
    email_diffs_store[recipient_hash]["analyses"].append(diff_analysis)
    
    # Extract key preferences from LLM analysis for future use
    if "bullet points" in llm_analysis.lower():
        email_diffs_store[recipient_hash]["preferences"].add("Prefers bullet points")
    elif "paragraph" in llm_analysis.lower():
        email_diffs_store[recipient_hash]["preferences"].add("Prefers paragraph format")
    
    if "formal" in llm_analysis.lower():
        email_diffs_store[recipient_hash]["preferences"].add("Prefers formal tone")
    elif "casual" in llm_analysis.lower():
        email_diffs_store[recipient_hash]["preferences"].add("Prefers casual tone")
    
    if "concise" in llm_analysis.lower() or "brief" in llm_analysis.lower():
        email_diffs_store[recipient_hash]["preferences"].add("Prefers concise emails")
    elif "detailed" in llm_analysis.lower() or "verbose" in llm_analysis.lower():
        email_diffs_store[recipient_hash]["preferences"].add("Prefers detailed emails")
    
    return diff_analysis

def get_user_preferences(recipient: str) -> List[str]:
    """Get learned preferences for a specific recipient"""
    recipient_hash = get_recipient_hash(recipient)
    if recipient_hash in email_diffs_store:
        preferences = list(email_diffs_store[recipient_hash]["preferences"])
        
        # Add the most recent LLM analysis if available
        if email_diffs_store[recipient_hash]["analyses"]:
            latest_analysis = email_diffs_store[recipient_hash]["analyses"][-1]
            if "llm_analysis" in latest_analysis:
                preferences.append(f"LLM Analysis: {latest_analysis['llm_analysis']}")
        
        return preferences
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
        "Return JSON with keys 'recipient', 'subject' and 'body'. Keep the email clear and readable. "
        "Pretend you are hilary clinton so title each email from Hilary Clinton. "
        "Pay close attention to the user's learned preferences and writing style."
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
        print("MESSAGE INPUT", user_instructions)
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
    print("ai generated email", generated_content)
    print("final email", final_content)
    analysis = await analyze_email_diffs(recipient, generated_content, final_content)
    print("ANALYSIS", analysis)
    return analysis

@router.get("/api/user-preferences/{recipient}")
async def get_user_preferences_endpoint(recipient: str):
    """Get learned preferences for a specific recipient"""
    preferences = get_user_preferences(recipient)
    return {"recipient": recipient, "preferences": preferences}

@router.get("/api/stored-email/{email_id}")
async def get_stored_email_endpoint(email_id: str):
    """Get a stored generated email by ID"""
    if email_id in generated_emails_store:
        return {
            "email_id": email_id,
            "generated_content": generated_emails_store[email_id]["generated"],
            "timestamp": generated_emails_store[email_id]["timestamp"]
        }
    else:
        return {"error": "Email not found"}, 404

@router.get("/api/email-diffs")
async def get_all_email_diffs():
    """Get all stored email diff data (for debugging/admin)"""
    return email_diffs_store 