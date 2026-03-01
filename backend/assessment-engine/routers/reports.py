from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas import APIResponse
from services.assessment_service import ReportService, RankingService

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/{report_code}", response_model=APIResponse)
def get_report(report_code: str, db: Session = Depends(get_db)):
    """获取测评报告"""
    report = ReportService.get_report_by_code(db, report_code)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    return APIResponse(data={
        "id": report.id,
        "report_code": report.report_code,
        "task_id": report.task_id,
        "summary": report.summary,
        "dimensions": report.dimensions,
        "recommendations": report.recommendations,
        "is_deep_report": report.is_deep_report,
        "created_at": report.created_at.isoformat() if report.created_at else None
    })

@router.get("/task/{task_id}", response_model=APIResponse)
def get_report_by_task(task_id: str, db: Session = Depends(get_db)):
    """通过任务ID获取报告"""
    report = ReportService.get_report_by_task(db, task_id)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    return APIResponse(data={
        "id": report.id,
        "report_code": report.report_code,
        "task_id": report.task_id,
        "summary": report.summary,
        "is_deep_report": report.is_deep_report,
        "created_at": report.created_at.isoformat() if report.created_at else None
    })

@router.post("/{report_id}/unlock", response_model=APIResponse)
def unlock_report(report_id: str, db: Session = Depends(get_db)):
    """解锁深度报告（需要支付后调用）"""
    try:
        report = ReportService.unlock_deep_report(db, report_id)
        return APIResponse(
            message="深度报告已解锁",
            data={
                "report_id": report.id,
                "is_deep_report": report.is_deep_report,
                "unlocked_at": report.unlocked_at.isoformat() if report.unlocked_at else None
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
