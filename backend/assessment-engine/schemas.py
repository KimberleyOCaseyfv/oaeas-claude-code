from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# ============== Enums ==============

class AgentType(str, Enum):
    GENERAL = "general"
    CODING = "coding"
    CREATIVE = "creative"

class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class PaymentChannel(str, Enum):
    WECHAT = "wechat"
    ALIPAY = "alipay"
    STRIPE = "stripe"
    PAYPAL = "paypal"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"

class Level(str, Enum):
    NOVICE = "Novice"
    PROFICIENT = "Proficient"
    EXPERT = "Expert"
    MASTER = "Master"

# ============== Token Schemas ==============

class TokenCreate(BaseModel):
    name: str
    description: Optional[str] = None
    agent_type: AgentType = AgentType.GENERAL
    max_uses: int = Field(default=100, ge=1, le=10000)
    expires_days: Optional[int] = Field(default=None, ge=1, le=365)

class TokenResponse(BaseModel):
    id: str
    token_code: str
    name: str
    description: Optional[str]
    agent_type: str
    status: str
    max_uses: int
    used_count: int
    created_at: datetime
    expires_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# ============== Assessment Schemas ==============

class AssessmentCreate(BaseModel):
    token_code: str
    agent_id: str
    agent_name: str
    agent_description: Optional[str] = None

class DimensionScore(BaseModel):
    name: str
    score: float
    max_score: float
    weight: float

class AssessmentResponse(BaseModel):
    id: str
    task_code: str
    token_id: str
    agent_id: str
    agent_name: str
    status: str
    total_score: float
    level: Optional[str]
    dimensions: List[DimensionScore]
    duration_seconds: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True

class AssessmentStatus(BaseModel):
    task_id: str
    status: str
    progress_percent: int
    current_test: Optional[str]
    estimated_remaining_seconds: Optional[int]

# ============== Report Schemas ==============

class ReportSummary(BaseModel):
    total_score: float
    level: str
    ranking_percentile: float
    strength_areas: List[str]
    improvement_areas: List[str]

class ReportDetail(BaseModel):
    id: str
    report_code: str
    task_id: str
    summary: ReportSummary
    dimensions: Dict[str, Any]
    test_cases: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    is_deep_report: bool
    created_at: datetime

# ============== Payment Schemas ==============

class PaymentCreate(BaseModel):
    task_id: str
    report_id: str
    channel: PaymentChannel
    currency: str = "CNY"

class PaymentResponse(BaseModel):
    order_code: str
    amount: float
    currency: str
    channel: str
    status: str
    qr_code_url: Optional[str] = None
    pay_url: Optional[str] = None
    client_secret: Optional[str] = None
    expire_seconds: int = 300

# ============== Ranking Schemas ==============

class RankingItem(BaseModel):
    rank: int
    agent_name: str
    agent_type: str
    total_score: float
    level: str
    task_count: int

class RankingList(BaseModel):
    items: List[RankingItem]
    total: int
    page: int
    page_size: int

# ============== API Response ==============

class APIResponse(BaseModel):
    code: int = 200
    message: str = "success"
    data: Optional[Any] = None

class ErrorResponse(BaseModel):
    code: int
    message: str
    detail: Optional[str] = None
