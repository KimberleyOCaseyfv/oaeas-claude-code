"""OAEAS V2 Auth Router - Anonymous Token + Bot-Human Binding"""
import os
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.database import AnonymousToken, InviteCode, BotHumanBinding, User, TokenUsageLog
from schemas import (
    AnonymousTokenCreate, AnonymousTokenResponse,
    BindingInitiate, APIResponse, ErrorDetail
)

router = APIRouter(prefix="/api/v1", tags=["auth"])

ANON_TOKEN_TTL = int(os.getenv("ANON_TOKEN_TTL_SECONDS", "7200"))   # 2h
IP_RATE_LIMIT  = int(os.getenv("IP_RATE_LIMIT_PER_HOUR", "10"))
AGENT_RATE_LIMIT = int(os.getenv("AGENT_RATE_LIMIT_PER_DAY", "5"))


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate_limit_db(db: Session, ip: str, agent_id: str) -> Optional[str]:
    """Simple DB-based rate limiting (no Redis needed for test env)."""
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    one_day_ago  = datetime.utcnow() - timedelta(hours=24)

    # IP limit: 10/hour
    ip_count = (
        db.query(AnonymousToken)
        .filter(AnonymousToken.ip_address == ip)
        .filter(AnonymousToken.created_at >= one_hour_ago)
        .count()
    )
    if ip_count >= IP_RATE_LIMIT:
        return f"OCE-5001: Rate limit exceeded: {IP_RATE_LIMIT} requests/hour per IP"

    # Agent ID limit: 5/24h
    agent_count = (
        db.query(AnonymousToken)
        .filter(AnonymousToken.agent_id == agent_id)
        .filter(AnonymousToken.created_at >= one_day_ago)
        .count()
    )
    if agent_count >= AGENT_RATE_LIMIT:
        return f"OCE-5002: Rate limit exceeded: {AGENT_RATE_LIMIT} tokens/24h per agent_id"

    return None


def _make_tmp_token() -> str:
    alphabet = string.ascii_lowercase + string.digits
    return "ocb_tmp_" + "".join(secrets.choice(alphabet) for _ in range(32))


@router.post("/auth/anonymous", response_model=APIResponse, status_code=201)
def create_anonymous_token(
    body: AnonymousTokenCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Obtain a temporary anonymous token for one assessment run."""
    ip = _get_client_ip(request)

    # Rate limit check
    err = _check_rate_limit_db(db, ip, body.agent_id)
    if err:
        raise HTTPException(status_code=429, detail=err)

    token_value = _make_tmp_token()
    expires_at  = datetime.utcnow() + timedelta(seconds=ANON_TOKEN_TTL)

    anon = AnonymousToken(
        token_value=token_value,
        agent_id=body.agent_id,
        agent_name=body.agent_name,
        protocol=body.protocol.value,
        ip_address=ip,
        expires_at=expires_at,
    )
    db.add(anon)

    # Log usage
    db.add(TokenUsageLog(
        token_id=token_value,
        token_type="anonymous",
        action="create",
        ip_address=ip,
        user_agent=request.headers.get("User-Agent", ""),
        metadata_={"agent_id": body.agent_id, "protocol": body.protocol.value},
    ))
    db.commit()

    return APIResponse(
        success=True,
        data=AnonymousTokenResponse(
            tmp_token=token_value,
            expires_in=ANON_TOKEN_TTL,
            expires_at=expires_at,
            allowed_assessments=1,
        ).model_dump(mode="json"),
    )


# ── Bot-Human Binding ─────────────────────────────────────────────────────────

def _make_invite_code() -> str:
    chars = string.ascii_uppercase + string.digits
    part1 = "".join(secrets.choice(chars) for _ in range(6))
    part2 = "".join(secrets.choice(chars) for _ in range(6))
    return f"OCBIND-{part1}-{part2}"


def _resolve_token(authorization: Optional[str], db: Session):
    """Return (anon_token_obj, formal_token_obj) from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token_val = authorization.removeprefix("Bearer ").strip()
    if token_val.startswith("ocb_tmp_"):
        anon = db.query(AnonymousToken).filter(AnonymousToken.token_value == token_val).first()
        if not anon or anon.expires_at < datetime.utcnow():
            raise HTTPException(status_code=401, detail="OCE-1001: Invalid or expired anonymous token")
        return anon, None
    raise HTTPException(status_code=401, detail="OCE-4001: Only anonymous tokens may initiate binding via this endpoint")


@router.post("/auth/bind", response_model=APIResponse)
def initiate_binding(
    body: BindingInitiate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Bot submits an invite code to request Bot-Human binding."""
    authorization = request.headers.get("Authorization")
    anon_token, _ = _resolve_token(authorization, db)

    # Validate invite code
    invite = db.query(InviteCode).filter(
        InviteCode.code == body.invite_code,
        InviteCode.used == False,
        InviteCode.expires_at > datetime.utcnow(),
    ).first()
    if not invite:
        raise HTTPException(status_code=404, detail="OCE-1010: Invite code not found or expired")

    # Create binding record
    binding = BotHumanBinding(
        human_user_id=invite.human_user_id,
        anon_token_id=anon_token.id,
        invite_code=body.invite_code,
        status="pending_confirm",
        agent_id=body.agent_id,
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(binding)
    db.commit()
    db.refresh(binding)

    return APIResponse(
        success=True,
        data={
            "binding_id": str(binding.id),
            "status": "pending_confirm",
            "message": "Binding request sent. Awaiting human confirmation.",
        },
    )
