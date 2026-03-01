"""
Bot端API - Agent-First架构核心
所有接口支持Bot自主调用，无需人类前置干预
"""

from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import random
import string

from database import get_db
from models.database import (
    TempToken, BoundToken, AgentBinding, User, 
    AssessmentTask, Report, PaymentOrder
)
from schemas import APIResponse
from services.assessment_service import AssessmentService

router = APIRouter(prefix="/api/v1/bots", tags=["Bot API"])

# ============== 请求模型 ==============

class TempTokenRequest(BaseModel):
    agent_id: str
    agent_name: Optional[str] = None

class AssessmentRequest(BaseModel):
    agent_id: str
    callback_url: Optional[str] = None

class BindRequest(BaseModel):
    invite_code: str

# ============== 辅助函数 ==============

def generate_temp_token_code() -> str:
    """生成临时Token代码"""
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(random.choices(chars, k=8))
    return f"TMP-{random_part}"

def generate_bound_token_code() -> str:
    """生成正式Token代码"""
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(random.choices(chars, k=8))
    return f"BND-{random_part}"

def generate_invite_code() -> str:
    """生成邀请码"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=8))

def get_temp_token_from_header(temp_token: Optional[str] = Header(None)):
    """从Header获取临时Token"""
    if not temp_token:
        raise HTTPException(status_code=401, detail="缺少X-Temp-Token头")
    return temp_token

# ============== 1. 获取临时Token (冷启动) ==============

@router.post("/temp-token", response_model=APIResponse)
def create_temp_token(
    request: TempTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Bot获取临时匿名Token，完成冷启动
    无需人类操作，24小时有效
    """
    # 检查是否已有活跃的临时Token
    existing = db.query(TempToken).filter(
        TempToken.agent_id == request.agent_id,
        TempToken.status == "active"
    ).first()
    
    if existing:
        return {
            "code": 200,
            "message": "success",
            "data": {
                "temp_token_code": existing.temp_token_code,
                "expires_at": existing.expires_at.isoformat() if existing.expires_at else None,
                "message": "已存在活跃的临时Token"
            }
        }
    
    # 创建新的临时Token
    expires_at = datetime.utcnow() + timedelta(hours=24)
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
        "message": "success",
        "data": {
            "temp_token_code": temp_token.temp_token_code,
            "agent_id": request.agent_id,
            "expires_at": expires_at.isoformat(),
            "api_base": "http://43.162.103.222:8001",
            "message": "临时Token创建成功，24小时内有效"
        }
    }

# ============== 2. 发起测评 ==============

@router.post("/assessments")
def create_assessment(
    request: AssessmentRequest,
    temp_token_code: str = Header(..., alias="X-Temp-Token"),
    db: Session = Depends(get_db)
):
    """
    Bot自主发起测评
    立即执行模拟测评并返回结果
    """
    # 验证临时Token
    temp_token = db.query(TempToken).filter(
        TempToken.temp_token_code == temp_token_code,
        TempToken.status.in_(["active", "bound"]),
        TempToken.expires_at > datetime.utcnow()
    ).first()
    
    if not temp_token:
        raise HTTPException(status_code=401, detail="临时Token无效或已过期")
    
    if temp_token.agent_id != request.agent_id:
        raise HTTPException(status_code=403, detail="Token与Agent ID不匹配")
    
    # 创建测评任务
    from services.assessment_service import AssessmentService
    task_code = AssessmentService.generate_task_code()
    
    from models.database import AssessmentTask
    task = AssessmentTask(
        task_code=task_code,
        agent_id=request.agent_id,
        agent_name=temp_token.agent_name or request.agent_id,
        temp_token_id=temp_token.id,
        initiated_by="bot",
        status="running",
        callback_url=request.callback_url
    )
    
    db.add(task)
    db.commit()
    db.refresh(task)
    
    # 立即执行标准化测评 V2
    from services.assessment_engine_v2 import run_standardized_assessment_v2
    result = run_standardized_assessment_v2(request.agent_id, temp_token.agent_name)
    
    # 更新任务结果
    task.status = "completed"
    task.tool_score = result["dimensions"]["tool_usage"]["score"]
    task.reasoning_score = result["dimensions"]["reasoning"]["score"]
    task.interaction_score = result["dimensions"]["interaction"]["score"]
    task.stability_score = result["dimensions"]["stability"]["score"]
    task.total_score = result["raw_score"]
    task.level = result["level"]
    task.duration_seconds = 5
    db.commit()
    
    # 生成报告（转换为旧格式兼容）
    from services.mock_engine import generate_free_report, generate_full_report
    from models.database import Report
    
    # 转换为旧格式
    legacy_result = {
        "total_score": result["raw_score"],
        "level": result["level"],
        "ranking_percentile": result["ranking_percentile"],
        "tool_score": result["dimensions"]["tool_usage"]["score"],
        "reasoning_score": result["dimensions"]["reasoning"]["score"],
        "interaction_score": result["dimensions"]["interaction"]["score"],
        "stability_score": result["dimensions"]["stability"]["score"]
    }
    
    free_report_data = generate_free_report(task_code, request.agent_id, legacy_result)
    full_report_data = generate_full_report(task_code, request.agent_id, legacy_result)
    
    report = Report(
        report_code=f"OCR-{datetime.now().strftime('%Y%m%d')}{random.randint(1000,9999)}",
        task_id=task.id,
        summary=free_report_data["score"],
        dimensions=full_report_data["dimensions"],
        recommendations=full_report_data["recommendations"],
        ranking_percentile=free_report_data["score"]["percentile"],
        json_report=full_report_data,
        is_deep_report=1  # 免费模式下默认解锁
    )
    db.add(report)
    db.commit()
    
    # 更新排行榜
    from services.assessment_service import AssessmentService
    AssessmentService._update_ranking(db, task)
    
    return {
        "code": 200,
        "message": "测评完成",
        "data": {
            "task_code": task_code,
            "status": "completed",
            "total_score": result["raw_score"],
            "weighted_score": result["weighted_score"],
            "level": result["level"],
            "duration_seconds": 5,
            "free_report_url": f"/api/v1/bots/reports/{task_code}/free",
            "full_report_url": f"/api/v1/bots/reports/{task_code}/full",
            "message": "测评已完成，可立即获取报告"
        }
    }

# ============== 3. 查询测评状态 ==============

@router.get("/assessments/{task_code}", response_model=APIResponse)
def get_assessment_status(
    task_code: str,
    temp_token_code: str = Header(..., alias="X-Temp-Token"),
    db: Session = Depends(get_db)
):
    """
    Bot查询测评状态和进度
    """
    # 验证Token
    temp_token = db.query(TempToken).filter(
        TempToken.temp_token_code == temp_token_code,
        TempToken.status.in_(["active", "bound"])
    ).first()
    
    if not temp_token:
        raise HTTPException(status_code=401, detail="Token无效")
    
    # 查询任务
    task = db.query(AssessmentTask).filter(
        AssessmentTask.task_code == task_code,
        AssessmentTask.agent_id == temp_token.agent_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="测评任务不存在")
    
    # 计算进度
    progress = 0
    if task.status == "pending":
        progress = 0
    elif task.status == "running":
        progress = 50
    elif task.status == "completed":
        progress = 100
    
    return {
        "code": 200,
        "message": "success", 
        "data": {
            "task_code": task_code,
            "status": task.status,
            "progress": progress,
            "total_score": task.total_score if task.status == "completed" else None,
            "level": task.level if task.status == "completed" else None,
            "free_report_available": task.status == "completed",
            "full_report_unlocked": True  # 免费模式下默认解锁
        }
    }

# ============== 4. 获取免费版报告 ==============

@router.get("/reports/{task_code}/free")
def get_free_report(
    task_code: str,
    temp_token_code: str = Header(..., alias="X-Temp-Token"),
    db: Session = Depends(get_db)
):
    """
    Bot获取免费版结构化报告（JSON格式）
    仅包含：总分、等级、排名百分位、摘要
    """
    # 验证Token
    temp_token = db.query(TempToken).filter(
        TempToken.temp_token_code == temp_token_code
    ).first()
    
    if not temp_token:
        raise HTTPException(status_code=401, detail="Token无效")
    
    # 查询任务和报告
    task = db.query(AssessmentTask).filter(
        AssessmentTask.task_code == task_code,
        AssessmentTask.agent_id == temp_token.agent_id,
        AssessmentTask.status == "completed"
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="测评未完成或不存在")
    
    # 通过task_id查询报告
    report = db.query(Report).filter(Report.task_id == task.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    # 从json_report中获取免费版数据
    json_report = report.json_report or {}
    score_data = json_report.get("score", {})
    
    free_report = {
        "version": "1.0",
        "task_code": task_code,
        "agent_id": task.agent_id,
        "generated_at": report.created_at.isoformat() if report.created_at else None,
        "score": {
            "total": score_data.get("total", task.total_score),
            "max": 1000,
            "level": score_data.get("level", task.level),
            "percentile": score_data.get("percentile", report.ranking_percentile)
        },
        "summary": f"Agent {task.agent_id} 测评完成，总分{task.total_score}分",
        "upgrade_prompt": "免费模式下所有报告已解锁，可直接获取完整报告"
    }
    
    return {
        "code": 200,
        "message": "success",
        "data": free_report
    }

# ============== 5. 生成深度报告支付链接 ==============

@router.post("/payments/link", response_model=APIResponse)
def create_payment_link(
    task_code: str,
    channel: str,  # wechat/alipay/stripe/paypal
    currency: str = "CNY",
    temp_token_code: str = Header(..., alias="X-Temp-Token"),
    db: Session = Depends(get_db)
):
    """
    Bot生成深度报告解锁的支付链接
    """
    # 验证Token
    temp_token = db.query(TempToken).filter(
        TempToken.temp_token_code == temp_token_code
    ).first()
    
    if not temp_token:
        raise HTTPException(status_code=401, detail="Token无效")
    
    # 查询任务
    task = db.query(AssessmentTask).filter(
        AssessmentTask.task_code == task_code,
        AssessmentTask.agent_id == temp_token.agent_id
    ).first()
    
    if not task or not task.report:
        raise HTTPException(status_code=404, detail="测评或报告不存在")
    
    if task.report.is_deep_report == 1:
        return APIResponse(message="深度报告已解锁")
    
    # 生成订单号
    order_code = f"OCB{datetime.now().strftime('%Y%m%d%H%M%S')}{random.randint(1000,9999)}"
    
    # 定价
    pricing = {"CNY": 9.9, "USD": 1.0}
    amount = pricing.get(currency, 9.9)
    
    # 创建订单
    order = PaymentOrder(
        order_code=order_code,
        agent_id=task.agent_id,
        task_id=task.id,
        report_id=task.report.id,
        amount=amount,
        currency=currency,
        channel=channel,
        status="pending",
        unlock_webhook_url=task.callback_url,
        refund_eligible_until=datetime.utcnow() + timedelta(hours=1)
    )
    
    db.add(order)
    db.commit()
    
    # 构造支付链接（简化版，实际应调用支付SDK）
    payment_url = f"http://43.162.103.222:3000/pay/{order_code}?channel={channel}"
    
    return APIResponse(data={
        "payment_url": payment_url,
        "order_code": order_code,
        "amount": amount,
        "currency": currency,
        "channel": channel,
        "expires_at": (datetime.utcnow() + timedelta(minutes=30)).isoformat(),
        "note": "人类完成支付后，Bot将通过webhook或轮询获取解锁通知"
    })

# ============== 6. 获取深度报告（解锁后） ==============

@router.get("/reports/{task_code}/full", response_model=APIResponse)
def get_full_report(
    task_code: str,
    temp_token_code: str = Header(..., alias="X-Temp-Token"),
    db: Session = Depends(get_db)
):
    """
    Bot获取完整深度报告（JSON格式）
    需要深度报告已解锁
    """
    # 验证Token
    temp_token = db.query(TempToken).filter(
        TempToken.temp_token_code == temp_token_code
    ).first()
    
    if not temp_token:
        raise HTTPException(status_code=401, detail="Token无效")
    
    # 查询任务和报告
    task = db.query(AssessmentTask).filter(
        AssessmentTask.task_code == task_code,
        AssessmentTask.agent_id == temp_token.agent_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    # 通过task_id查询报告
    report = db.query(Report).filter(Report.task_id == task.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    # 免费模式下默认解锁
    # if report.is_deep_report != 1:
    #     raise HTTPException(status_code=403, detail="深度报告未解锁，请先支付")
    
    # 返回完整结构化报告
    full_report = report.json_report or {
        "version": "1.0",
        "task_code": task_code,
        "agent_id": task.agent_id,
        "generated_at": report.created_at.isoformat() if report.created_at else None,
        "score": {
            "total": task.total_score,
            "max": 1000,
            "level": task.level,
            "percentile": report.ranking_percentile
        },
        "dimensions": report.dimensions,
        "recommendations": report.recommendations,
        "ranking": {
            "global_rank": 42,
            "total_agents": 1000,
            "top_percentile": 4.2
        }
    }
    
    return {
        "code": 200,
        "message": "success",
        "data": full_report
    }

# ============== 7. 主动绑定人类账户 ==============

@router.post("/bind")
def bind_to_human(
    request: BindRequest,
    temp_token_code: str = Header(..., alias="X-Temp-Token"),
    db: Session = Depends(get_db)
):
    """
    Bot主动发起与人类账户的绑定
    """
    # 验证Token
    temp_token = db.query(TempToken).filter(
        TempToken.temp_token_code == temp_token_code,
        TempToken.status == "active"
    ).first()
    
    if not temp_token:
        raise HTTPException(status_code=401, detail="临时Token无效或已过期")
    
    # 查找邀请码对应的人类用户
    user = db.query(User).filter(
        User.invite_code == request.invite_code,
        User.invite_code_expires_at > datetime.utcnow()
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="邀请码无效或已过期")
    
    # 检查是否已绑定
    existing_binding = db.query(AgentBinding).filter(
        AgentBinding.agent_id == temp_token.agent_id,
        AgentBinding.user_id == user.id
    ).first()
    
    if existing_binding:
        return {
            "code": 200,
            "message": "已绑定到该用户",
            "data": {"status": "already_bound"}
        }
    
    # 创建绑定关系
    binding = AgentBinding(
        agent_id=temp_token.agent_id,
        user_id=user.id,
        invite_code=request.invite_code,
        initiated_by="bot",
        status="active"
    )
    
    # 创建正式Token
    bound_token = BoundToken(
        token_code=generate_bound_token_code(),
        agent_id=temp_token.agent_id,
        user_id=user.id,
        invite_code=request.invite_code,
        status="active"
    )
    
    # 更新临时Token状态
    temp_token.status = "bound"
    temp_token.bound_to_user_id = user.id
    
    db.add(binding)
    db.add(bound_token)
    db.commit()
    
    return {
        "code": 200,
        "message": "绑定成功",
        "data": {
            "bound_token": bound_token.token_code,
            "user_email": user.email,
            "user_name": user.name,
            "bound_at": binding.bound_at.isoformat() if binding.bound_at else None,
            "message": "绑定成功，可以使用正式Token发起测评"
        }
    }
    db.query(AssessmentTask).filter(
        AssessmentTask.temp_token_id == temp_token.id
    ).update({
        "bound_token_id": bound_token.id
    })
    
    db.add(binding)
    db.add(bound_token)
    db.commit()
    
    return APIResponse(data={
        "status": "bound",
        "agent_id": temp_token.agent_id,
        "user_id": str(user.id),
        "user_email": user.email,
        "bound_token_code": bound_token.token_code,
        "data_migrated": True,
        "message": "绑定成功，历史数据已迁移"
    })

# ============== 8. PDF报告下载 ==============

@router.get("/reports/{task_code}/pdf")
def download_pdf_report(
    task_code: str,
    temp_token_code: str = Header(..., alias="X-Temp-Token"),
    db: Session = Depends(get_db)
):
    """
    Bot下载PDF格式报告
    """
    # 验证Token
    temp_token = db.query(TempToken).filter(
        TempToken.temp_token_code == temp_token_code
    ).first()
    
    if not temp_token:
        raise HTTPException(status_code=401, detail="Token无效")
    
    # 查询任务和报告
    task = db.query(AssessmentTask).filter(
        AssessmentTask.task_code == task_code,
        AssessmentTask.agent_id == temp_token.agent_id,
        AssessmentTask.status == "completed"
    ).first()
    
    if not task or not task.report:
        raise HTTPException(status_code=404, detail="测评未完成或不存在")
    
    # 准备报告数据
    json_report = task.report.json_report or {}
    report_data = {
        "agent_id": task.agent_id,
        "task_code": task_code,
        "total_score": task.total_score,
        "level": task.level,
        "dimensions": json_report.get("dimensions", {})
    }
    
    # 生成PDF（使用WeasyPrint新版）
    from services.pdf_service_v2 import generate_pdf_report
    
    try:
        pdf_data = generate_pdf_report(report_data)
        
        # 返回PDF文件
        from fastapi.responses import Response
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=OAEAS_Report_{task_code}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF生成失败: {str(e)}")

# ============== 9. 查询绑定状态 ==============

@router.get("/bind/status", response_model=APIResponse)
def get_bind_status(
    temp_token_code: str = Header(..., alias="X-Temp-Token"),
    db: Session = Depends(get_db)
):
    """
    查询Bot的绑定状态
    """
    temp_token = db.query(TempToken).filter(
        TempToken.temp_token_code == temp_token_code
    ).first()
    
    if not temp_token:
        raise HTTPException(status_code=401, detail="Token无效")
    
    binding = db.query(AgentBinding).filter(
        AgentBinding.agent_id == temp_token.agent_id,
        AgentBinding.status == "active"
    ).first()
    
    if not binding:
        return APIResponse(data={
            "bound": False,
            "message": "Bot尚未绑定到人类账户"
        })
    
    user = db.query(User).filter(User.id == binding.user_id).first()
    
    return APIResponse(data={
        "bound": True,
        "user_email": user.email if user else None,
        "bound_at": binding.bound_at.isoformat(),
        "initiated_by": binding.initiated_by
    })
