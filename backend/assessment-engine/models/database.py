from sqlalchemy import create_engine, Column, String, Float, DateTime, Text, JSON, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import uuid

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    """用户表"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Token(Base):
    """测评Token表"""
    __tablename__ = "tokens"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    token_code = Column(String, unique=True, index=True)  # OCB-XXXX-XXXX
    name = Column(String)
    description = Column(Text)
    agent_type = Column(String)  # general/coding/creative
    status = Column(String, default="active")  # active/paused/expired
    max_uses = Column(Integer, default=100)
    used_count = Column(Integer, default=0)
    created_by = Column(String)  # user_id
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

class AssessmentTask(Base):
    """测评任务表"""
    __tablename__ = "assessment_tasks"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    task_code = Column(String, unique=True, index=True)  # OCBT-XXXXXXXX
    token_id = Column(String, index=True)
    agent_id = Column(String)  # 被测Agent标识
    agent_name = Column(String)
    status = Column(String, default="pending")  # pending/running/completed/failed
    
    # 4维度评分 (0-1000)
    tool_score = Column(Float, default=0)  # OpenClaw工具调用 400分
    reasoning_score = Column(Float, default=0)  # 基础认知推理 300分
    interaction_score = Column(Float, default=0)  # 交互意图理解 200分
    stability_score = Column(Float, default=0)  # 稳定性合规 100分
    total_score = Column(Float, default=0)  # 总分
    
    level = Column(String)  # Novice/Proficient/Expert/Master
    duration_seconds = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

class TestCase(Base):
    """测试用例表"""
    __tablename__ = "test_cases"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    case_type = Column(String)  # tool/reasoning/interaction/stability
    difficulty = Column(String)  # easy/medium/hard
    content = Column(JSON)  # 用例内容
    expected_result = Column(JSON)
    weight = Column(Float, default=1.0)  # 权重
    tags = Column(JSON, default=list)  # 标签

class TestResult(Base):
    """测试结果表"""
    __tablename__ = "test_results"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    task_id = Column(String, index=True)
    case_id = Column(String, index=True)
    
    status = Column(String)  # passed/failed/error
    score = Column(Float, default=0)
    response_time_ms = Column(Integer)
    actual_result = Column(JSON)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class Report(Base):
    """测评报告表"""
    __tablename__ = "reports"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    report_code = Column(String, unique=True, index=True)  # OCR-XXXXXXXX
    task_id = Column(String, index=True)
    
    # 报告内容
    summary = Column(JSON)  # 摘要数据
    dimensions = Column(JSON)  # 各维度详情
    test_cases = Column(JSON)  # 测试用例结果
    recommendations = Column(JSON)  # 改进建议
    ranking_percentile = Column(Float)  # 排名百分位
    
    is_deep_report = Column(Integer, default=0)  # 0=免费版 1=深度版
    unlocked_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class PaymentOrder(Base):
    """支付订单表"""
    __tablename__ = "payment_orders"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    order_code = Column(String, unique=True, index=True)  # OCBYYYYMMDDHHMMSS+6位
    user_id = Column(String, index=True)
    task_id = Column(String, index=True)
    report_id = Column(String, index=True)
    
    amount = Column(Float)
    currency = Column(String, default="CNY")
    channel = Column(String)  # wechat/alipay/stripe/paypal
    status = Column(String, default="pending")  # pending/paid/failed/refunded
    
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Ranking(Base):
    """排行榜表"""
    __tablename__ = "rankings"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    agent_name = Column(String, index=True)
    agent_type = Column(String)
    total_score = Column(Float)
    level = Column(String)
    rank = Column(Integer)
    task_count = Column(Integer, default=1)
    updated_at = Column(DateTime, default=datetime.utcnow)

class SystemConfig(Base):
    """系统配置表"""
    __tablename__ = "system_configs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    config_key = Column(String, unique=True, index=True)
    config_value = Column(JSON)
    updated_at = Column(DateTime, default=datetime.utcnow)
