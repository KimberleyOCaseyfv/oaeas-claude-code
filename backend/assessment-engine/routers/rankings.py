from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas import APIResponse
from services.assessment_service import RankingService

router = APIRouter(prefix="/rankings", tags=["Rankings"])

@router.get("", response_model=APIResponse)
def get_rankings(
    agent_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """获取排行榜"""
    rankings = RankingService.get_rankings(db, agent_type, skip, limit)
    
    return APIResponse(data=[
        {
            "rank": r.rank,
            "agent_name": r.agent_name,
            "agent_type": r.agent_type,
            "total_score": round(r.total_score, 2),
            "level": r.level,
            "task_count": r.task_count
        }
        for r in rankings
    ])

@router.get("/agent/{agent_name}", response_model=APIResponse)
def get_agent_ranking(agent_name: str, db: Session = Depends(get_db)):
    """获取特定Agent的排名"""
    ranking = RankingService.get_agent_ranking(db, agent_name)
    if not ranking:
        raise HTTPException(status_code=404, detail="该Agent暂无排名")
    
    return APIResponse(data={
        "rank": ranking.rank,
        "agent_name": ranking.agent_name,
        "agent_type": ranking.agent_type,
        "total_score": round(ranking.total_score, 2),
        "level": ranking.level,
        "task_count": ranking.task_count
    })
