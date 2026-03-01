"""
用户端API - 人类账户管理
极简设计，仅保留核心功能
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
import random
import string

from database import get_db
from models.database import User, TempToken, BoundToken, AgentBinding, AssessmentTask
from schemas import APIResponse

router = APIRouter(prefix="/api/v1/users", tags=["User API"])

# 请求模型
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

def generate_invite_code() -> str:
    """生成8位邀请码"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=8))

# ============== 1. 极简注册（仅邮箱） ==============

@router.post("/register", response_model=APIResponse)
def register_user(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    极简邮箱注册，无需验证，立即可用
    """
    # 检查邮箱是否已存在
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="邮箱已注册")
    
    # 创建用户
    user = User(
        email=request.email,
        name=request.name or request.email.split("@")[0]
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # 生成JWT token - 注册
    import jwt
    token = jwt.encode(
        {"user_id": str(user.id), "email": user.email, "exp": datetime.utcnow() + timedelta(days=7)},
        "ocbjwtsecret2026",
        algorithm="HS256"
    )
    
    return {
        "code": 200,
        "message": "success",
        "data": {
            "user_id": str(user.id),
            "email": user.email,
            "name": user.name,
            "token": token,
            "message": "注册成功"
        }
    }

# ============== 2. 登录 ==============

@router.post("/login", response_model=APIResponse)
def login_user(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    登录
    """
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    
    # 生成JWT token - 登录
    import jwt
    token = jwt.encode(
        {"user_id": str(user.id), "email": user.email, "exp": datetime.utcnow() + timedelta(days=7)},
        "ocbjwtsecret2026",
        algorithm="HS256"
    )
    
    return {
        "code": 200,
        "message": "success",
        "data": {
            "user_id": str(user.id),
            "email": user.email,
            "name": user.name,
            "token": token,
            "message": "登录成功"
        }
    }

# ============== JWT验证依赖 ==============

from fastapi import Header
from typing import Optional

def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """从Authorization header提取user_id"""
    if not authorization:
        raise HTTPException(status_code=401, detail="缺少认证信息")
    
    try:
        # 提取token
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        # 解码JWT
        import jwt
        payload = jwt.decode(token, "ocbjwtsecret2026", algorithms=["HS256"])
        return payload.get("user_id")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token已过期")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="无效的Token")

# ============== 3. 生成绑定邀请码 ==============

@router.post("/invite-code", response_model=APIResponse)
def generate_invite(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    生成Bot绑定邀请码
    有效期7天
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 生成新的邀请码
    invite_code = generate_invite_code()
    expires_at = datetime.utcnow() + timedelta(days=7)
    
    user.invite_code = invite_code
    user.invite_code_expires_at = expires_at
    
    db.commit()
    
    return {
        "code": 200,
        "message": "success",
        "data": {
            "invite_code": invite_code,
            "expires_at": expires_at.isoformat(),
            "instruction": "将此邀请码提供给Bot，Bot将主动发起绑定"
        }
    }

# ============== 4. 查看绑定的Bots ==============

@router.get("/bots", response_model=APIResponse)
def get_bound_bots(
    user_id: str,  # TODO: 从JWT获取
    db: Session = Depends(get_db)
):
    """
    查看已绑定的所有Bots
    """
    bindings = db.query(AgentBinding).filter(
        AgentBinding.user_id == user_id,
        AgentBinding.status == "active"
    ).all()
    
    bots = []
    for binding in bindings:
        # 获取该Agent的测评统计
        assessment_count = db.query(AssessmentTask).filter(
            AssessmentTask.agent_id == binding.agent_id
        ).count()
        
        # 获取最新测评分数
        latest_task = db.query(AssessmentTask).filter(
            AssessmentTask.agent_id == binding.agent_id,
            AssessmentTask.status == "completed"
        ).order_by(AssessmentTask.completed_at.desc()).first()
        
        bots.append({
            "agent_id": binding.agent_id,
            "bound_at": binding.bound_at.isoformat(),
            "assessments_count": assessment_count,
            "latest_score": latest_task.total_score if latest_task else None,
            "latest_level": latest_task.level if latest_task else None
        })
    
    return APIResponse(data={
        "bots_count": len(bots),
        "bots": bots
    })

# ============== 5. 查看名下所有测评任务 ==============

@router.get("/assessments", response_model=APIResponse)
def get_user_assessments(
    user_id: str,  # TODO: 从JWT获取
    db: Session = Depends(get_db)
):
    """
    查看用户名下所有Bot的测评任务
    """
    # 获取用户绑定的所有Agent
    bindings = db.query(AgentBinding).filter(
        AgentBinding.user_id == user_id,
        AgentBinding.status == "active"
    ).all()
    
    agent_ids = [b.agent_id for b in bindings]
    
    # 查询这些Agent的所有测评任务
    tasks = db.query(AssessmentTask).filter(
        AssessmentTask.agent_id.in_(agent_ids)
    ).order_by(AssessmentTask.created_at.desc()).all()
    
    return APIResponse(data=[
        {
            "task_code": t.task_code,
            "agent_id": t.agent_id,
            "status": t.status,
            "total_score": t.total_score if t.status == "completed" else None,
            "level": t.level if t.status == "completed" else None,
            "created_at": t.created_at.isoformat()
        }
        for t in tasks
    ])

# ============== 6. 查看报告详情 ==============

@router.get("/reports/{report_code}", response_model=APIResponse)
def get_user_report(
    report_code: str,
    user_id: str,  # TODO: 从JWT获取
    db: Session = Depends(get_db)
):
    """
    查看报告详情（人类可视化版本）
    """
    from models.database import Report
    
    report = db.query(Report).filter(Report.report_code == report_code).first()
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    # 验证报告是否属于该用户的Bot
    task = db.query(AssessmentTask).filter(AssessmentTask.id == report.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    binding = db.query(AgentBinding).filter(
        AgentBinding.agent_id == task.agent_id,
        AgentBinding.user_id == user_id,
        AgentBinding.status == "active"
    ).first()
    
    if not binding:
        raise HTTPException(status_code=403, detail="无权查看此报告")
    
    return APIResponse(data={
        "report_code": report.report_code,
        "task_code": task.task_code,
        "agent_id": task.agent_id,
        "total_score": task.total_score,
        "level": task.level,
        "summary": report.summary,
        "dimensions": report.dimensions,
        "recommendations": report.recommendations if report.is_deep_report == 1 else None,
        "is_deep_report": report.is_deep_report == 1
    })

# ============== 7. 解锁深度报告（支付） ==============

@router.post("/reports/{report_code}/unlock", response_model=APIResponse)
def unlock_report(
    report_code: str,
    user_id: str,  # TODO: 从JWT获取
    db: Session = Depends(get_db)
):
    """
    单次付款解锁深度报告
    """
    from models.database import Report
    
    report = db.query(Report).filter(Report.report_code == report_code).first()
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    if report.is_deep_report == 1:
        return APIResponse(message="深度报告已解锁")
    
    # TODO: 调用支付流程
    # 这里简化处理，实际应调用支付SDK
    
    # 解锁报告
    report.is_deep_report = 1
    report.unlocked_at = datetime.utcnow()
    db.commit()
    
    # TODO: 通知Bot（webhook）
    
    return APIResponse(data={
        "report_code": report_code,
        "unlocked": True,
        "amount_paid": 9.9,
        "currency": "CNY"
    })

from typing import Optional