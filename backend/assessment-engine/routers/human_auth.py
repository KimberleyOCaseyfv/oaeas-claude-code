"""
human_auth.py
=============
Human user authentication and management router.

Endpoints:
  POST /api/v1/human/auth/magic-link   – Request a magic-link (OTP) via email
  GET  /api/v1/human/auth/verify       – Verify OTP, receive JWT
  POST /api/v1/human/invite-codes      – Generate a Bot-Human invite code
  POST /api/v1/human/bindings/{id}/confirm – Confirm a pending Bot-Human binding
  GET  /api/v1/human/me                – Get current human user profile
"""

import os
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from database import get_db
from models.database import BotHumanBinding, InviteCode, Token, User

router = APIRouter(prefix="/api/v1/human", tags=["human-auth"])

JWT_SECRET = os.getenv("JWT_SECRET", "oaeas_jwt_dev_secret_change_in_production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "7"))
MAGIC_LINK_TTL = int(os.getenv("MAGIC_LINK_TTL_SECONDS", "900"))  # 15 min
INVITE_CODE_TTL_HOURS = 24


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_otp(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


def _make_invite_code() -> str:
    chars = string.ascii_uppercase + string.digits
    p1 = "".join(secrets.choice(chars) for _ in range(6))
    p2 = "".join(secrets.choice(chars) for _ in range(6))
    return f"OCBIND-{p1}-{p2}"


def _create_jwt(user_id: str, email: str) -> str:
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {"sub": user_id, "email": email, "exp": expire, "iat": datetime.utcnow()}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_jwt(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None


def _get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="OCE-4001: Missing Authorization")
    token = auth.removeprefix("Bearer ").strip()
    payload = _decode_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="OCE-4002: Invalid or expired JWT")
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="OCE-4003: User not found")
    return user


def _send_magic_link_email(email: str, otp: str) -> bool:
    """
    Send magic-link email.  In production, integrate SendGrid / SES / SMTP here.
    In development, the OTP is returned in the API response for convenience.
    """
    smtp_host = os.getenv("SMTP_HOST")
    if not smtp_host:
        # Dev mode: no email sending, OTP exposed via API response
        return False

    try:
        import smtplib
        from email.mime.text import MIMEText

        msg = MIMEText(
            f"Your OAEAS login code is: {otp}\n\nThis code expires in 15 minutes.",
            "plain",
        )
        msg["Subject"] = "Your OAEAS Login Code"
        msg["From"] = os.getenv("SMTP_FROM", "noreply@oaeas.io")
        msg["To"] = email

        with smtplib.SMTP(smtp_host, int(os.getenv("SMTP_PORT", "587"))) as server:
            server.starttls()
            server.login(os.getenv("SMTP_USER", ""), os.getenv("SMTP_PASSWORD", ""))
            server.send_message(msg)
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Schemas (inline to avoid circular imports)
# ---------------------------------------------------------------------------

class MagicLinkRequest(BaseModel):
    email: str
    name: Optional[str] = None


class MagicLinkVerifyRequest(BaseModel):
    email: str
    otp: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/auth/magic-link")
def request_magic_link(body: MagicLinkRequest, db: Session = Depends(get_db)):
    """
    Step 1 of Human login: send a 6-digit OTP to the user's email.
    Creates the user account on first call (email-based sign-up).
    """
    email = body.email.lower().strip()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, name=body.name or email.split("@")[0])
        db.add(user)
        db.flush()

    otp = _make_otp()
    user.magic_link_token = otp
    user.magic_link_expires = datetime.utcnow() + timedelta(seconds=MAGIC_LINK_TTL)
    db.commit()

    email_sent = _send_magic_link_email(email, otp)

    response_data: dict = {
        "message": "OTP sent. Check your email.",
        "expires_in": MAGIC_LINK_TTL,
        "email_sent": email_sent,
    }
    # In dev mode (no SMTP configured), expose OTP directly so developers can test
    if not email_sent:
        response_data["dev_otp"] = otp
        response_data["dev_note"] = (
            "SMTP not configured – OTP exposed for development only. "
            "Set SMTP_HOST env var to enable real email delivery."
        )

    return {"success": True, "data": response_data}


@router.post("/auth/verify")
def verify_magic_link(body: MagicLinkVerifyRequest, db: Session = Depends(get_db)):
    """
    Step 2 of Human login: verify the OTP and receive a JWT access token.
    """
    email = body.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()

    if not user or not user.magic_link_token:
        raise HTTPException(status_code=400, detail="OCE-4010: No pending OTP for this email")

    if user.magic_link_expires and user.magic_link_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OCE-4011: OTP has expired")

    if not secrets.compare_digest(user.magic_link_token, body.otp.strip()):
        raise HTTPException(status_code=400, detail="OCE-4012: Invalid OTP")

    # Consume OTP
    user.magic_link_token = None
    user.magic_link_expires = None
    user.last_login_at = datetime.utcnow()
    user.login_count = (user.login_count or 0) + 1
    db.commit()

    access_token = _create_jwt(str(user.id), user.email)

    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_in": JWT_EXPIRE_DAYS * 86400,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
            },
        },
    }


@router.get("/me")
def get_current_user_profile(
    request: Request,
    db: Session = Depends(get_db),
):
    """Return the authenticated human user's profile."""
    user = _get_current_user(request, db)
    return {
        "success": True,
        "data": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "login_count": user.login_count or 0,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
    }


@router.post("/invite-codes")
def create_invite_code(
    request: Request,
    db: Session = Depends(get_db),
):
    """Generate a Bot-Human invite code (requires Human JWT)."""
    user = _get_current_user(request, db)

    code = _make_invite_code()
    invite = InviteCode(
        code=code,
        human_user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(hours=INVITE_CODE_TTL_HOURS),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    return {
        "success": True,
        "data": {
            "invite_code": code,
            "expires_at": invite.expires_at.isoformat(),
            "expires_in_hours": INVITE_CODE_TTL_HOURS,
            "instructions": (
                "Share this invite code with your Agent. "
                "The Agent should POST it to /api/v1/auth/bind."
            ),
        },
    }


@router.post("/bindings/{binding_id}/confirm")
def confirm_binding(
    binding_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Confirm a pending Bot-Human binding (Human must be authenticated)."""
    user = _get_current_user(request, db)

    binding = db.query(BotHumanBinding).filter(
        BotHumanBinding.id == binding_id,
        BotHumanBinding.human_user_id == user.id,
        BotHumanBinding.status == "pending_confirm",
    ).first()

    if not binding:
        raise HTTPException(status_code=404, detail="OCE-3001: Binding not found or already processed")

    if binding.expires_at and binding.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OCE-3002: Binding request has expired")

    # Mark invite code as used
    invite = db.query(InviteCode).filter(InviteCode.code == binding.invite_code).first()
    if invite:
        invite.used = True
        invite.used_by_agent = binding.agent_id

    binding.status = "bound"
    binding.confirmed_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "data": {
            "binding_id": str(binding.id),
            "status": "bound",
            "agent_id": binding.agent_id,
            "confirmed_at": binding.confirmed_at.isoformat(),
        },
    }


@router.get("/bindings")
def list_bindings(
    request: Request,
    db: Session = Depends(get_db),
):
    """List all Bot-Human bindings for the authenticated user."""
    user = _get_current_user(request, db)
    bindings = (
        db.query(BotHumanBinding)
        .filter(BotHumanBinding.human_user_id == user.id)
        .order_by(BotHumanBinding.initiated_at.desc())
        .limit(50)
        .all()
    )

    return {
        "success": True,
        "data": [
            {
                "binding_id": str(b.id),
                "agent_id": b.agent_id,
                "status": b.status,
                "initiated_at": b.initiated_at.isoformat() if b.initiated_at else None,
                "confirmed_at": b.confirmed_at.isoformat() if b.confirmed_at else None,
            }
            for b in bindings
        ],
    }
