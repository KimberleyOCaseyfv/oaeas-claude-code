"""OAEAS V2 Pydantic Schemas"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from enum import Enum


# ── Enums ────────────────────────────────────────────────────────────────────

class Protocol(str, Enum):
    OPENAI    = "openai"
    ANTHROPIC = "anthropic"
    OPENCLAW  = "openclaw"
    HTTP      = "http"
    MOCK      = "mock"   # test env: built-in mock agent

class TaskStatus(str, Enum):
    PENDING   = "pending"
    RUNNING   = "running"
    COMPLETED = "completed"
    FAILED    = "failed"
    ABORTED   = "aborted"

class Level(str, Enum):
    NOVICE    = "Novice"
    PROFICIENT = "Proficient"
    EXPERT    = "Expert"
    MASTER    = "Master"

class PaymentChannel(str, Enum):
    WECHAT = "wechat"
    ALIPAY = "alipay"
    STRIPE = "stripe"
    PAYPAL = "paypal"
    MOCK   = "mock"    # test env

class Currency(str, Enum):
    CNY = "CNY"
    USD = "USD"


# ── Anonymous Token ───────────────────────────────────────────────────────────

class AnonymousTokenCreate(BaseModel):
    agent_id:     str = Field(..., min_length=1, max_length=128)
    agent_name:   Optional[str] = None
    protocol:     Protocol = Protocol.OPENAI
    capabilities: Optional[List[str]] = None

class AnonymousTokenResponse(BaseModel):
    tmp_token:            str
    expires_in:           int  # seconds
    expires_at:           datetime
    allowed_assessments:  int = 1


# ── Formal Token ──────────────────────────────────────────────────────────────

class TokenCreate(BaseModel):
    name:         str
    description:  Optional[str] = None
    agent_type:   str = "general"
    max_uses:     int = 100
    expires_days: Optional[int] = None

class TokenResponse(BaseModel):
    id:         str
    token_code: str
    name:       str
    status:     str
    used_count: int
    max_uses:   int
    created_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Binding ───────────────────────────────────────────────────────────────────

class BindingInitiate(BaseModel):
    invite_code: str = Field(..., pattern=r"^OCBIND-[A-Z0-9]{6}-[A-Z0-9]{6}$")
    agent_id:    str

class InviteCodeResponse(BaseModel):
    invite_code:  str
    expires_at:   datetime
    instructions: str


# ── Assessment Task ───────────────────────────────────────────────────────────

class ProtocolConfig(BaseModel):
    protocol:     Protocol = Protocol.MOCK
    endpoint_url: Optional[str] = None     # None / "mock" → use built-in mock agent
    auth_header:  Optional[str] = None

class TaskCreate(BaseModel):
    agent_id:        str = Field(..., min_length=1, max_length=128)
    agent_name:      str = Field(..., min_length=1, max_length=255)
    protocol_config: ProtocolConfig = ProtocolConfig()
    webhook_url:     Optional[str] = None

class TaskResponse(BaseModel):
    task_id:                    str
    task_code:                  str
    status:                     TaskStatus
    estimated_duration_seconds: int = 300
    phases:                     List[str] = ["tool_usage", "reasoning", "interaction", "stability"]
    created_at:                 datetime

    class Config:
        from_attributes = True

class TaskStatusResponse(BaseModel):
    task_id:  str
    status:   TaskStatus
    phase:    int
    progress: Dict[str, Any]

class DimensionScore(BaseModel):
    score:      float
    max_score:  float
    percentage: float

class AssessmentReport(BaseModel):
    report_code:           str
    task_code:             str
    total_score:           float
    level:                 Level
    percentile:            float
    scores:                Dict[str, DimensionScore]
    summary:               Dict[str, Any]
    assessment_meta:       Dict[str, Any]
    report_hash:           str
    deep_report_available: bool = True
    deep_report_price:     Dict[str, float] = {"cny": 9.9, "usd": 1.0}
    is_deep_report:        bool = False
    # Deep report fields (None if not unlocked)
    detailed_dimensions:   Optional[Dict[str, Any]] = None
    recommendations:       Optional[List[Dict[str, Any]]] = None


# ── Payment ───────────────────────────────────────────────────────────────────

class PaymentOrderCreate(BaseModel):
    report_code: str
    channel:     PaymentChannel = PaymentChannel.MOCK
    currency:    Currency = Currency.CNY

class PaymentOrderResponse(BaseModel):
    order_code: str
    amount:     float
    currency:   str
    channel:    str
    qr_url:     Optional[str] = None
    expires_at: datetime

class PaymentStatusResponse(BaseModel):
    order_code:      str
    status:          str   # pending/paid/failed/expired/refunded
    paid_at:         Optional[datetime] = None
    deep_report_url: Optional[str] = None
    pdf_url:         Optional[str] = None


# ── Rankings ──────────────────────────────────────────────────────────────────

class RankingEntry(BaseModel):
    rank:       int
    agent_name: str
    agent_type: str
    protocol:   Optional[str] = None
    total_score: float
    level:      str
    task_count: int
    updated_at: datetime

    class Config:
        from_attributes = True

class RankingsResponse(BaseModel):
    items: List[RankingEntry]
    total: int
    page:  int
    limit: int


# ── Shared Error ──────────────────────────────────────────────────────────────

class ErrorDetail(BaseModel):
    code:    str
    message: str
    details: Dict[str, Any] = {}

class APIResponse(BaseModel):
    success:    bool
    data:       Optional[Any] = None
    error:      Optional[ErrorDetail] = None
    request_id: Optional[str] = None
    timestamp:  datetime = Field(default_factory=datetime.utcnow)
