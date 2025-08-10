from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import os
import json
from pathlib import Path

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


class EmailRequest(BaseModel):
    bullets: List[str]
    tone: Optional[str] = "neutral"
    recipient: Optional[str] = None
    subject_hint: Optional[str] = None


class EmailResponse(BaseModel):
    subject: str
    body: str


def _fallback_generate_email(
    bullets: List[str],
    tone: Optional[str],
    recipient: Optional[str],
    subject_hint: Optional[str],
) -> EmailResponse:
    subject_seed = subject_hint or (bullets[0] if bullets else "Follow-up")
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
    return EmailResponse(subject=subject, body="\n".join(body_lines))


async def _generate_email_with_openai(payload: EmailRequest) -> EmailResponse:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or OpenAI is None:
        return _fallback_generate_email(
            payload.bullets, payload.tone, payload.recipient, payload.subject_hint
        )

    client = OpenAI(api_key=api_key)

    system = (
        "You are an assistant that turns bullet points into a polished, concise, professional email. "
        "Return JSON with keys 'subject' and 'body'. Keep the email clear and readable."
        "Pretend you are hilary clinton so title each email from Hilary Clinton"
    )

    user_instructions = {
        "bullets": payload.bullets,
        "tone": payload.tone,
        "recipient": payload.recipient,
        "subject_hint": payload.subject_hint,
        "requirements": [
            "Subject should be short and informative",
            "Body should be a few short paragraphs or a brief intro and a list",
            "Close politely",
        ],
    }

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": json.dumps(user_instructions)},
            ],
            temperature=0.3,
        )
        content = completion.choices[0].message.content
        data = json.loads(content)
        subject = data.get("subject") or (
            payload.subject_hint or (payload.bullets[0] if payload.bullets else "")
        )
        body = data.get("body") or _fallback_generate_email(
            payload.bullets, payload.tone, payload.recipient, payload.subject_hint
        ).body
        return EmailResponse(subject=subject, body=body)
    except Exception:
        # Fallback on any error (network, model, or formatting)
        return _fallback_generate_email(
            payload.bullets, payload.tone, payload.recipient, payload.subject_hint
        )



@router.post("/api/generate-email", response_model=EmailResponse)
async def generate_email(payload: EmailRequest):
    return await _generate_email_with_openai(payload) 