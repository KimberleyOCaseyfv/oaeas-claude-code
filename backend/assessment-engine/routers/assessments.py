from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas import APIResponse, AssessmentResponse, DimensionScore
from services.assessment_service import AssessmentService
from models.database import AssessmentTask

router = APIRouter(prefix="/assessments", tags=["Assessments"])

@router.get("/{task_code}", response_model=APIResponse)
def get_assessment(task_code: str, db: Session = Depends(get_db)):
    """获取测评任务详情"""
    task = AssessmentService.get_task_by_code(db, task_code)
    if not task:
        raise HTTPException(status_code=404, detail="测评任务不存在")
    
    dimensions = [
        DimensionScore(
            name="OpenClaw工具调用",
            score=task.tool_score,
            max_score=400,
            weight=0.4
        ),
        DimensionScore(
            name="基础认知推理",
            score=task.reasoning_score,
            max_score=300,
            weight=0.3
        ),
        DimensionScore(
            name="交互意图理解",
            score=task.interaction_score,
            max_score=200,
            weight=0.2
        ),
        DimensionScore(
            name="稳定性合规",
            score=task.stability_score,
            max_score=100,
            weight=0.1
        )
    ]
    
    return APIResponse(data={
        "id": task.id,
        "task_code": task.task_code,
        "agent_name": task.agent_name,
        "agent_id": task.agent_id,
        "status": task.status,
        "total_score": round(task.total_score, 2),
        "level": task.level,
        "dimensions": [d.dict() for d in dimensions],
        "duration_seconds": task.duration_seconds,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "started_at": task.started_at.isoformat() if task.started_at else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None
    })

@router.post("/{task_id}/start", response_model=APIResponse)
def start_assessment(
    task_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """启动测评任务（异步执行）"""
    task = AssessmentService.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="测评任务不存在")
    
    if task.status != "pending":
        raise HTTPException(status_code=400, detail=f"任务状态为 {task.status}，无法启动")
    
    # 后台执行测评
    background_tasks.add_task(AssessmentService.run_assessment, db, task_id)
    
    return APIResponse(
        message="测评任务已启动",
        data={"task_id": task_id, "status": "running"}
    )

@router.get("/{task_id}/status", response_model=APIResponse)
def get_assessment_status(task_id: str, db: Session = Depends(get_db)):
    """获取测评任务状态"""
    task = AssessmentService.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="测评任务不存在")
    
    # 计算进度（简化版）
    progress = 0
    if task.status == "pending":
        progress = 0
    elif task.status == "running":
        progress = 50  # 模拟进度
    elif task.status == "completed":
        progress = 100
    
    return APIResponse(data={
        "task_id": task_id,
        "task_code": task.task_code,
        "status": task.status,
        "progress_percent": progress,
        "total_score": round(task.total_score, 2) if task.total_score else None,
        "level": task.level
    })

@router.get("", response_model=APIResponse)
def list_assessments(
    agent_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """列出测评任务"""
    query = db.query(AssessmentTask)
    
    if agent_id:
        query = query.filter(AssessmentTask.agent_id == agent_id)
    if status:
        query = query.filter(AssessmentTask.status == status)
    
    tasks = query.order_by(AssessmentTask.created_at.desc()).offset(skip).limit(limit).all()
    
    return APIResponse(data=[
        {
            "id": t.id,
            "task_code": t.task_code,
            "agent_name": t.agent_name,
            "status": t.status,
            "total_score": round(t.total_score, 2) if t.total_score else None,
            "level": t.level,
            "created_at": t.created_at.isoformat() if t.created_at else None
        }
        for t in tasks
    ])
