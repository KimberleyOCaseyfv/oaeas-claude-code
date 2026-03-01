from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas import (
    TokenCreate, TokenResponse, APIResponse, AssessmentCreate,
    AssessmentResponse, AssessmentStatus
)
from services.assessment_service import TokenService, AssessmentService

router = APIRouter(prefix="/tokens", tags=["Tokens"])

@router.post("", response_model=APIResponse)
def create_token(
    data: TokenCreate,
    user_id: str = "user_001",  # TODO: 从JWT获取
    db: Session = Depends(get_db)
):
    """创建新的测评Token"""
    try:
        token = TokenService.create_token(db, user_id, data)
        from metrics import record_token_created
        record_token_created()
        return APIResponse(
            data=TokenResponse.from_orm(token)
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=APIResponse)
def list_tokens(
    user_id: str = "user_001",
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """列出用户的所有Token"""
    tokens = TokenService.list_tokens(db, user_id, skip, limit)
    return APIResponse(
        data=[TokenResponse.from_orm(t) for t in tokens]
    )

@router.get("/{token_code}", response_model=APIResponse)
def get_token(token_code: str, db: Session = Depends(get_db)):
    """获取Token详情"""
    token = TokenService.get_token_by_code(db, token_code)
    if not token:
        raise HTTPException(status_code=404, detail="Token不存在")
    return APIResponse(data=TokenResponse.from_orm(token))

@router.post("/{token_code}/validate", response_model=APIResponse)
def validate_token(token_code: str, db: Session = Depends(get_db)):
    """验证Token有效性"""
    is_valid, error_msg = TokenService.validate_token(db, token_code)
    return APIResponse(data={
        "valid": is_valid,
        "message": error_msg if not is_valid else "Token有效"
    })

@router.post("/{token_code}/assessments", response_model=APIResponse)
def create_assessment(
    token_code: str,
    data: AssessmentCreate,
    db: Session = Depends(get_db)
):
    """使用Token创建测评任务"""
    # 确保使用正确的token_code
    data.token_code = token_code
    try:
        task = AssessmentService.create_assessment(db, data)
        return APIResponse(data={
            "task_id": task.id,
            "task_code": task.task_code,
            "status": task.status,
            "message": "测评任务创建成功"
        })
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
