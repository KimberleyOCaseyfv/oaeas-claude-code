"""
Bot一键绑定API - 合并获取Token和绑定两个步骤
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
import random
import string

from database import get_db
from models.database import TempToken, BoundToken, AgentBinding, User, Token
from routers.bots import generate_temp_token_code, generate_bound_token_code
from services.assessment_service import AssessmentService
from schemas import AssessmentCreate

router = APIRouter(prefix="/api/v1/bots", tags=["Bot Quick Setup"])

def now_utc():
    """返回当前UTC时间（带时区）"""
    return datetime.now(timezone.utc)

def generate_token_code():
    """生成Token代码"""
    chars = string.ascii_uppercase + string.digits
    part1 = ''.join(random.choices(chars, k=4))
    part2 = ''.join(random.choices(chars, k=4))
    return f"OCB-{part1}-{part2}"

class QuickBindRequest(BaseModel):
    agent_id: str
    agent_name: str = None
    invite_code: str = None  # 可选，不传则自动绑定

@router.post("/quick-bind")
def quick_bind(
    request: QuickBindRequest,
    db: Session = Depends(get_db)
):
    """
    Bot一键绑定 - 同时完成获取Token和绑定
    简化流程：只需调用一次，传入agent_id即可（无需invite_code）
    """
    # 如果没有提供邀请码，自动绑定到任意一个有邀请码的用户
    if not request.invite_code:
        # 查找任意一个有效的邀请码用户（用于兼容旧流程）
        user = db.query(User).filter(
            User.invite_code.isnot(None),
            User.invite_code != "",
            User.invite_code_expires_at > now_utc()
        ).first()
        
        # 如果没有有效用户，创建一个临时绑定（仅获取Token）
        if not user:
            # 直接返回临时Token，不绑定到任何用户
            expires_at = now_utc() + timedelta(hours=24)
            temp_token = TempToken(
                temp_token_code=generate_temp_token_code(),
                agent_id=request.agent_id,
                agent_name=request.agent_name or request.agent_id,
                status="active",
                expires_at=expires_at
            )
            db.add(temp_token)
            db.commit()
            db.refresh(temp_token)
            
            return {
                "code": 200,
                "message": "获取临时Token成功（未绑定用户）",
                "data": {
                    "temp_token": temp_token.temp_token_code,
                    "status": "temp_only",
                    "message": "Token已生成，但未绑定到用户。如需绑定，请提供有效的邀请码"
                }
            }
        
        # 使用找到的用户的邀请码
        request.invite_code = user.invite_code
    else:
        # 验证邀请码
        user = db.query(User).filter(
            User.invite_code == request.invite_code,
            User.invite_code_expires_at > now_utc()
        ).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="邀请码无效或已过期")
    
    # 2. 创建正式Token（不是TempToken，可用于测评）
    token_code = generate_token_code()
    token = Token(
        token_code=token_code,
        name=request.agent_name or request.agent_id,
        description="通过quick-bind自动创建",
        agent_type="bot",
        max_uses=10,
        created_by=user.id if user else "system",
        status="active",
        expires_at=None  # 不设置过期时间
    )
    db.add(token)
    db.commit()
    db.refresh(token)
    
    # 创建临时Token（用于兼容）
    expires_at = now_utc() + timedelta(hours=24)
    temp_token = TempToken(
        temp_token_code=generate_temp_token_code(),
        agent_id=request.agent_id,
        agent_name=request.agent_name or request.agent_id,
        status="active",
        expires_at=expires_at
    )
    db.add(temp_token)
    db.commit()
    db.refresh(temp_token)
    
    # 3. 检查是否已绑定
    existing_binding = db.query(AgentBinding).filter(
        AgentBinding.agent_id == request.agent_id,
        AgentBinding.user_id == user.id
    ).first()
    
    if existing_binding:
        # 已绑定，也自动创建测评
        assessment_data = AssessmentCreate(
            token_code=temp_token.temp_token_code,
            agent_id=request.agent_id,
            agent_name=request.agent_name or request.agent_id,
            agent_description="通过quick-bind自动创建（已绑定）"
        )
        assessment_task = AssessmentService.create_assessment(db, assessment_data)
        AssessmentService.run_assessment(db, assessment_task.id)
        
        return {
            "code": 200,
            "message": "已绑定，测评已启动",
            "data": {
                "temp_token": temp_token.temp_token_code,
                "status": "already_bound",
                "assessment_task_id": assessment_task.id,
                "user_email": user.email,
                "user_name": user.name
            }
        }
    
    # 4. 创建绑定关系
    binding = AgentBinding(
        agent_id=request.agent_id,
        user_id=user.id,
        invite_code=request.invite_code,
        initiated_by="bot",
        status="active"
    )
    
    # 5. 创建正式Token
    bound_token = BoundToken(
        token_code=generate_bound_token_code(),
        agent_id=request.agent_id,
        user_id=user.id,
        invite_code=request.invite_code,
        status="active"
    )
    
    # 6. 更新临时Token状态
    temp_token.status = "bound"
    temp_token.bound_to_user_id = user.id
    
    db.add(binding)
    db.add(bound_token)
    db.commit()
    
    # 7. 自动创建测评任务
    assessment_data = AssessmentCreate(
        token_code=token.token_code,  # 使用正式Token
        agent_id=request.agent_id,
        agent_name=request.agent_name or request.agent_id,
        agent_description="通过quick-bind自动创建"
    )
    assessment_task = AssessmentService.create_assessment(db, assessment_data)
    
    # 8. 启动测评（同步执行）
    AssessmentService.run_assessment(db, assessment_task.id)
    
    return {
        "code": 200,
        "message": "绑定成功，测评已启动",
        "data": {
            "temp_token": temp_token.temp_token_code,
            "bound_token": bound_token.token_code,
            "user_email": user.email,
            "user_name": user.name,
            "assessment_task_id": assessment_task.id,
            "message": "绑定成功！测评已自动开始，请等待结果..."
        }
    }
