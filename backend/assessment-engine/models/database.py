"""OAEAS V2 SQLAlchemy ORM Models"""
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, Numeric, BigInteger,
    DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.orm import declarative_base
import uuid

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email               = Column(String(255), unique=True, nullable=False)
    name                = Column(String(255))
    magic_link_token    = Column(String(128))
    magic_link_expires  = Column(DateTime(timezone=True))
    last_login_at       = Column(DateTime(timezone=True))
    login_count         = Column(Integer, default=0)
    metadata_           = Column("metadata", JSON, default=dict)
    created_at          = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at          = Column(DateTime(timezone=True), default=datetime.utcnow)


class Token(Base):
    __tablename__ = "tokens"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_code  = Column(String(20), unique=True, nullable=False)
    name        = Column(String(255), nullable=False)
    description = Column(Text)
    agent_type  = Column(String(50), default="general")
    status      = Column(String(50), default="active")
    max_uses    = Column(Integer, default=100)
    used_count  = Column(Integer, default=0)
    created_by  = Column(UUID(as_uuid=True), nullable=True)  # no FK in free mode
    created_at  = Column(DateTime(timezone=True), default=datetime.utcnow)
    expires_at  = Column(DateTime(timezone=True))


class AnonymousToken(Base):
    __tablename__ = "anonymous_tokens"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_value = Column(String(64), unique=True, nullable=False)
    agent_id    = Column(String(128), nullable=False)
    agent_name  = Column(String(255))
    protocol    = Column(String(32), default="openai")
    ip_address  = Column(INET)
    expires_at  = Column(DateTime(timezone=True), nullable=False)
    used        = Column(Boolean, default=False)
    task_id     = Column(UUID(as_uuid=True))
    created_at  = Column(DateTime(timezone=True), default=datetime.utcnow)


class TokenUsageLog(Base):
    __tablename__ = "token_usage_logs"
    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_id   = Column(String(128), nullable=False)
    token_type = Column(String(20), nullable=False)
    action     = Column(String(64), nullable=False)
    ip_address = Column(INET)
    user_agent = Column(String(512))
    metadata_  = Column("metadata", JSON, default=dict)
    logged_at  = Column(DateTime(timezone=True), default=datetime.utcnow)


class InviteCode(Base):
    __tablename__ = "invite_codes"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code          = Column(String(20), unique=True, nullable=False)
    human_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    used          = Column(Boolean, default=False)
    used_by_agent = Column(String(128))
    expires_at    = Column(DateTime(timezone=True), nullable=False)
    created_at    = Column(DateTime(timezone=True), default=datetime.utcnow)


class BotHumanBinding(Base):
    __tablename__ = "bot_human_bindings"
    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    human_user_id  = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    agent_token_id = Column(UUID(as_uuid=True), ForeignKey("tokens.id"))
    anon_token_id  = Column(UUID(as_uuid=True), ForeignKey("anonymous_tokens.id"))
    invite_code    = Column(String(20), nullable=False)
    status         = Column(String(32), default="pending_confirm")
    agent_id       = Column(String(128))
    initiated_at   = Column(DateTime(timezone=True), default=datetime.utcnow)
    confirmed_at   = Column(DateTime(timezone=True))
    expires_at     = Column(DateTime(timezone=True), nullable=False)


class AssessmentTask(Base):
    __tablename__ = "assessment_tasks"
    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_code        = Column(String(30), unique=True, nullable=False)
    token_id         = Column(UUID(as_uuid=True), ForeignKey("tokens.id"))
    anon_token_id    = Column(UUID(as_uuid=True), ForeignKey("anonymous_tokens.id"))
    agent_id         = Column(String(128), nullable=False)
    agent_name       = Column(String(255), nullable=False)
    agent_protocol   = Column(String(32), default="openai")
    endpoint_url     = Column(String(512))
    auth_header      = Column(String(512))
    seed             = Column(BigInteger)
    status           = Column(String(32), default="pending")
    phase            = Column(Integer, default=0)
    cases_total      = Column(Integer, default=45)
    cases_completed  = Column(Integer, default=0)
    timeout_count    = Column(Integer, default=0)
    veto_triggered   = Column(Boolean, default=False)
    veto_reason      = Column(String(512))
    anti_cheat_flags = Column(JSON, default=list)
    tool_score       = Column(Numeric(8, 2), default=0)
    reasoning_score  = Column(Numeric(8, 2), default=0)
    interaction_score = Column(Numeric(8, 2), default=0)
    stability_score  = Column(Numeric(8, 2), default=0)
    total_score      = Column(Numeric(8, 2), default=0)
    level            = Column(String(32))
    duration_seconds = Column(Integer)
    webhook_url      = Column(String(512))
    created_at       = Column(DateTime(timezone=True), default=datetime.utcnow)
    started_at       = Column(DateTime(timezone=True))
    completed_at     = Column(DateTime(timezone=True))


class TestCase(Base):
    __tablename__ = "test_cases"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_type       = Column(String(50), nullable=False)
    difficulty      = Column(String(20), default="medium")
    content         = Column(JSON, nullable=False)
    expected_result = Column(JSON)
    weight          = Column(Numeric(3, 2), default=1.0)
    tags            = Column(JSON, default=list)


class TestResult(Base):
    __tablename__ = "test_results"
    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id          = Column(UUID(as_uuid=True), ForeignKey("assessment_tasks.id"))
    case_id          = Column(UUID(as_uuid=True), ForeignKey("test_cases.id"))
    dimension        = Column(String(32))
    difficulty       = Column(String(20))
    status           = Column(String(32))
    score            = Column(Numeric(8, 2), default=0)
    max_score        = Column(Numeric(8, 2), default=0)
    response_time_ms = Column(Integer)
    actual_result    = Column(JSON)
    error_message    = Column(Text)
    created_at       = Column(DateTime(timezone=True), default=datetime.utcnow)


class SandboxExecution(Base):
    __tablename__ = "sandbox_executions"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id       = Column(UUID(as_uuid=True), ForeignKey("assessment_tasks.id"), nullable=False)
    case_id       = Column(UUID(as_uuid=True))
    tool_name     = Column(String(64), nullable=False)
    input_params  = Column(JSON)
    output_result = Column(JSON)
    duration_ms   = Column(Integer)
    success       = Column(Boolean)
    error_message = Column(Text)
    called_at     = Column(DateTime(timezone=True), default=datetime.utcnow)


class AntiCheatLog(Base):
    __tablename__ = "anti_cheat_logs"
    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id    = Column(UUID(as_uuid=True), ForeignKey("assessment_tasks.id"), nullable=False)
    layer      = Column(Integer, nullable=False)
    check_type = Column(String(64), nullable=False)
    result     = Column(String(20), nullable=False)
    evidence   = Column(Text)
    metadata_  = Column("metadata", JSON, default=dict)
    checked_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class Report(Base):
    __tablename__ = "reports"
    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_code      = Column(String(30), unique=True, nullable=False)
    task_id          = Column(UUID(as_uuid=True), ForeignKey("assessment_tasks.id"))
    summary          = Column(JSON)
    dimensions       = Column(JSON)
    test_cases       = Column(JSON, default=list)
    recommendations  = Column(JSON, default=list)
    is_deep_report   = Column(Integer, default=0)
    report_hash      = Column(String(80))
    bot_payload      = Column(JSON)
    human_html_url   = Column(String(512))
    pdf_url          = Column(String(512))
    payment_order_id = Column(UUID(as_uuid=True))
    unlocked_at      = Column(DateTime(timezone=True))
    created_at       = Column(DateTime(timezone=True), default=datetime.utcnow)


class ReportHash(Base):
    __tablename__ = "report_hashes"
    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id      = Column(UUID(as_uuid=True), ForeignKey("reports.id"), unique=True, nullable=False)
    hash_value     = Column(String(80), nullable=False)
    hash_algorithm = Column(String(20), default="sha256")
    signed_at      = Column(DateTime(timezone=True), default=datetime.utcnow)
    payload_size   = Column(Integer)


class PaymentOrder(Base):
    __tablename__ = "payment_orders"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_code    = Column(String(40), unique=True, nullable=False)
    report_id     = Column(UUID(as_uuid=True), ForeignKey("reports.id"))
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    anon_token_id = Column(UUID(as_uuid=True), ForeignKey("anonymous_tokens.id"))
    amount        = Column(Numeric(10, 2), nullable=False)
    currency      = Column(String(10), default="CNY")
    channel       = Column(String(20))
    status        = Column(String(20), default="pending")
    qr_url        = Column(String(512))
    paid_at       = Column(DateTime(timezone=True))
    expires_at    = Column(DateTime(timezone=True))
    created_at    = Column(DateTime(timezone=True), default=datetime.utcnow)


class WebhookSubscription(Base):
    __tablename__ = "webhook_subscriptions"
    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id      = Column(UUID(as_uuid=True), ForeignKey("assessment_tasks.id"), nullable=False)
    endpoint_url = Column(String(512), nullable=False)
    secret       = Column(String(128))
    events       = Column(JSON, default=lambda: ["task.completed"])
    active       = Column(Boolean, default=True)
    created_at   = Column(DateTime(timezone=True), default=datetime.utcnow)


class Ranking(Base):
    __tablename__ = "rankings"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id    = Column(String(128))
    agent_name  = Column(String(255), nullable=False)
    agent_type  = Column(String(50), default="general")
    protocol    = Column(String(32))
    total_score = Column(Numeric(8, 2), default=0)
    level       = Column(String(32))
    rank        = Column(Integer)
    task_count  = Column(Integer, default=0)
    updated_at  = Column(DateTime(timezone=True), default=datetime.utcnow)
    created_at  = Column(DateTime(timezone=True), default=datetime.utcnow)


class SystemConfig(Base):
    __tablename__ = "system_config"
    key        = Column(String(100), primary_key=True)
    value      = Column(Text, nullable=False)
    description = Column(Text)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)
