from sqlalchemy import create_engine, Column, String, Float, DateTime, Text, JSON, Integer, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import uuid

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

# ============== 用户表 ==============
class User(Base):
    """人类用户表"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    invite_code = Column(String, unique=True, index=True)
    invite_code_expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ============== Token体系 (Agent-First) ==============

class TempToken(Base):
    """临时匿名Token - Bot冷启动用"""
    __tablename__ = "temp_tokens"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    temp_token_code = Column(String(32), unique=True, index=True)
    agent_id = Column(String(255), index=True)
    agent_name = Column(String(255))
    status = Column(String(50), default="active")  # active/expired/revoked/bound
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    bound_to_user_id = Column(String, ForeignKey("users.id"), nullable=True)

class BoundToken(Base):
    """正式绑定Token - 关联人类账户用"""
    __tablename__ = "bound_tokens"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    token_code = Column(String(32), unique=True, index=True)
    agent_id = Column(String(255), index=True)
    user_id = Column(String, ForeignKey("users.id"))
    invite_code = Column(String(32), index=True)  # 移除unique约束，支持多Bot使用同一邀请码
    status = Column(String(50), default="active")  # active/revoked
    created_at = Column(DateTime, default=datetime.utcnow)
    revoked_at = Column(DateTime)

class AgentBinding(Base):
    """Agent-人类绑定关系表"""
    __tablename__ = "agent_bindings"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    agent_id = Column(String(255), index=True)
    user_id = Column(String, ForeignKey("users.id"))
    invite_code = Column(String(32), index=True)
    initiated_by = Column(String(50), default="bot")  # bot/user
    bound_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="active")  # active/unbound

# ============== 旧版Token表（兼容保留）=============
class Token(Base):
    """测评Token表 - 旧版"""
    __tablename__ = "tokens"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    token_code = Column(String(20), unique=True, index=True)
    name = Column(String)
    description = Column(Text)
    agent_type = Column(String)
    status = Column(String, default="active")
    max_uses = Column(Integer, default=100)
    used_count = Column(Integer, default=0)
    created_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

# ============== 测评相关表 ==============

class AssessmentTask(Base):
    """测评任务表"""
    __tablename__ = "assessment_tasks"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    task_code = Column(String(30), unique=True, index=True)
    
    # Token关联（新版双Token体系）
    temp_token_id = Column(String, ForeignKey("temp_tokens.id"), nullable=True)
    bound_token_id = Column(String, ForeignKey("bound_tokens.id"), nullable=True)
    
    # 旧版兼容
    token_id = Column(String, index=True, nullable=True)
    
    agent_id = Column(String(255), index=True)
    agent_name = Column(String)
    initiated_by = Column(String(50), default="bot")  # bot/human
    status = Column(String, default="pending")
    callback_url = Column(String(500))
    
    tool_score = Column(Float, default=0)
    reasoning_score = Column(Float, default=0)
    interaction_score = Column(Float, default=0)
    stability_score = Column(Float, default=0)
    total_score = Column(Float, default=0)
    
    level = Column(String)
    duration_seconds = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # 关系
    report = relationship("Report", back_populates="task", uselist=False)

class TestCase(Base):
    """测试用例表"""
    __tablename__ = "test_cases"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    case_type = Column(String)
    difficulty = Column(String)
    content = Column(JSON)
    expected_result = Column(JSON)
    weight = Column(Float, default=1.0)
    tags = Column(JSON, default=list)

class TestResult(Base):
    """测试结果表"""
    __tablename__ = "test_results"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    task_id = Column(String, index=True)
    case_id = Column(String, index=True)
    status = Column(String)
    score = Column(Float, default=0)
    response_time_ms = Column(Integer)
    actual_result = Column(JSON)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Report(Base):
    """测评报告表"""
    __tablename__ = "reports"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    report_code = Column(String(30), unique=True, index=True)
    task_id = Column(String, ForeignKey("assessment_tasks.id"), index=True)
    
    report_type = Column(String(50), default="full")  # free/full
    
    summary = Column(JSON)
    dimensions = Column(JSON)
    test_cases = Column(JSON)
    recommendations = Column(JSON)
    ranking_percentile = Column(Float)
    
    json_report = Column(JSON)
    webhook_url = Column(String(500))
    webhook_delivered = Column(Boolean, default=False)
    webhook_delivered_at = Column(DateTime)
    
    is_deep_report = Column(Integer, default=0)
    unlocked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    task = relationship("AssessmentTask", back_populates="report")

class PaymentOrder(Base):
    """支付订单表"""
    __tablename__ = "payment_orders"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    order_code = Column(String(50), unique=True, index=True)
    user_id = Column(String, index=True)
    agent_id = Column(String(255), index=True)
    task_id = Column(String, index=True)
    report_id = Column(String, index=True)
    
    amount = Column(Float)
    currency = Column(String, default="CNY")
    channel = Column(String)
    status = Column(String, default="pending")
    
    unlock_webhook_url = Column(String(500))
    webhook_notified = Column(Boolean, default=False)
    refund_eligible_until = Column(DateTime)
    
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Ranking(Base):
    """排行榜表"""
    __tablename__ = "rankings"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    agent_id = Column(String(255), index=True)
    agent_name = Column(String, index=True)
    agent_type = Column(String)
    total_score = Column(Float)
    level = Column(String)
    rank = Column(Integer)
    task_count = Column(Integer, default=1)
    is_bound = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow)

class SystemConfig(Base):
    """系统配置表"""
    __tablename__ = "system_configs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    config_key = Column(String, unique=True, index=True)
    config_value = Column(JSON)
    updated_at = Column(DateTime, default=datetime.utcnow)
