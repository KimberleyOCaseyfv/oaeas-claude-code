import random
import string
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from models.database import Token, AssessmentTask, TestCase, TestResult, Report, Ranking
from schemas import (
    TokenCreate, TokenResponse, AssessmentCreate, AssessmentResponse,
    DimensionScore, AssessmentStatus, AgentType, TaskStatus, Level
)

class TokenService:
    """Token管理服务"""
    
    @staticmethod
    def generate_token_code() -> str:
        """生成Token代码: OCB-XXXX-XXXX"""
        chars = string.ascii_uppercase + string.digits
        part1 = ''.join(random.choices(chars, k=4))
        part2 = ''.join(random.choices(chars, k=4))
        return f"OCB-{part1}-{part2}"
    
    @classmethod
    def create_token(cls, db: Session, user_id: str, data: TokenCreate) -> Token:
        """创建新Token"""
        token = Token(
            token_code=cls.generate_token_code(),
            name=data.name,
            description=data.description,
            agent_type=data.agent_type.value,
            max_uses=data.max_uses,
            created_by=user_id
        )
        
        if data.expires_days:
            token.expires_at = datetime.utcnow() + timedelta(days=data.expires_days)
        
        db.add(token)
        db.commit()
        db.refresh(token)
        return token
    
    @classmethod
    def get_token_by_code(cls, db: Session, token_code: str) -> Optional[Token]:
        """通过代码获取Token"""
        return db.query(Token).filter(Token.token_code == token_code).first()
    
    @classmethod
    def list_tokens(cls, db: Session, user_id: str, skip: int = 0, limit: int = 100) -> List[Token]:
        """列出用户的Tokens"""
        return db.query(Token).filter(Token.created_by == user_id).offset(skip).limit(limit).all()
    
    @classmethod
    def validate_token(cls, db: Session, token_code: str) -> tuple[bool, Optional[str]]:
        """验证Token有效性"""
        token = cls.get_token_by_code(db, token_code)
        
        if not token:
            return False, "Token不存在"
        
        if token.status != "active":
            return False, f"Token状态为 {token.status}"
        
        if token.used_count >= token.max_uses:
            return False, "Token使用次数已达上限"
        
        if token.expires_at and token.expires_at < datetime.utcnow():
            return False, "Token已过期"
        
        return True, None


class AssessmentService:
    """测评服务"""
    
    @staticmethod
    def generate_task_code() -> str:
        """生成任务代码: OCBT-XXXXXXXX"""
        timestamp = datetime.now().strftime("%Y%m%d")
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        return f"OCBT-{timestamp}{random_part}"
    
    @classmethod
    def create_assessment(cls, db: Session, data: AssessmentCreate) -> AssessmentTask:
        """创建测评任务"""
        # 验证Token
        is_valid, error_msg = TokenService.validate_token(db, data.token_code)
        if not is_valid:
            raise ValueError(error_msg)
        
        token = TokenService.get_token_by_code(db, data.token_code)
        
        # 创建任务
        task = AssessmentTask(
            task_code=cls.generate_task_code(),
            token_id=token.id,
            agent_id=data.agent_id,
            agent_name=data.agent_name,
            status=TaskStatus.PENDING.value
        )
        
        db.add(task)
        
        # 更新Token使用次数
        token.used_count += 1
        
        db.commit()
        db.refresh(task)
        return task
    
    @classmethod
    def get_task(cls, db: Session, task_id: str) -> Optional[AssessmentTask]:
        """获取任务详情"""
        return db.query(AssessmentTask).filter(AssessmentTask.id == task_id).first()
    
    @classmethod
    def get_task_by_code(cls, db: Session, task_code: str) -> Optional[AssessmentTask]:
        """通过代码获取任务"""
        return db.query(AssessmentTask).filter(AssessmentTask.task_code == task_code).first()
    
    @classmethod
    def calculate_level(cls, total_score: float) -> str:
        """根据总分计算等级"""
        if total_score >= 850:
            return Level.MASTER.value
        elif total_score >= 700:
            return Level.EXPERT.value
        elif total_score >= 500:
            return Level.PROFICIENT.value
        else:
            return Level.NOVICE.value
    
    @classmethod
    def run_assessment(cls, db: Session, task_id: str) -> AssessmentTask:
        """
        运行测评（简化版）
        实际实现中这里会调用真实的Agent进行测试
        """
        task = cls.get_task(db, task_id)
        if not task:
            raise ValueError("任务不存在")
        
        if task.status != TaskStatus.PENDING.value:
            raise ValueError(f"任务状态为 {task.status}，无法开始测评")
        
        # 更新状态为运行中
        task.status = TaskStatus.RUNNING.value
        task.started_at = datetime.utcnow()
        db.commit()
        
        try:
            # TODO: 实际测评逻辑
            # 1. 获取测试用例
            # 2. 逐一测试
            # 3. 记录结果
            # 4. 计算分数
            
            # 模拟测评结果（实际实现中替换为真实逻辑）
            task.tool_score = random.uniform(250, 400)
            task.reasoning_score = random.uniform(180, 300)
            task.interaction_score = random.uniform(120, 200)
            task.stability_score = random.uniform(60, 100)
            task.total_score = task.tool_score + task.reasoning_score + task.interaction_score + task.stability_score
            task.level = cls.calculate_level(task.total_score)
            task.status = TaskStatus.COMPLETED.value
            task.completed_at = datetime.utcnow()
            
            # 计算持续时间
            if task.started_at:
                task.duration_seconds = int((task.completed_at - task.started_at).total_seconds())
            
            db.commit()
            db.refresh(task)
            
            # 生成报告
            cls._generate_report(db, task)
            
        except Exception as e:
            task.status = TaskStatus.FAILED.value
            db.commit()
            raise e
        
        return task
    
    @classmethod
    def _generate_report(cls, db: Session, task: AssessmentTask) -> Report:
        """生成测评报告"""
        # 生成报告代码
        report_code = f"OCR-{datetime.now().strftime('%Y%m%d')}{random.randint(1000, 9999)}"
        
        # 构建维度详情
        dimensions = {
            "tool_usage": {
                "score": task.tool_score,
                "max_score": 400,
                "weight": 0.4,
                "details": {
                    "tool_selection": task.tool_score * 0.3,
                    "parameter_filling": task.tool_score * 0.3,
                    "tool_chaining": task.tool_score * 0.25,
                    "error_correction": task.tool_score * 0.15
                }
            },
            "reasoning": {
                "score": task.reasoning_score,
                "max_score": 300,
                "weight": 0.3,
                "details": {
                    "logic": task.reasoning_score * 0.35,
                    "math": task.reasoning_score * 0.35,
                    "long_text": task.reasoning_score * 0.3
                }
            },
            "interaction": {
                "score": task.interaction_score,
                "max_score": 200,
                "weight": 0.2,
                "details": {
                    "intent_recognition": task.interaction_score * 0.5,
                    "emotion_perception": task.interaction_score * 0.5
                }
            },
            "stability": {
                "score": task.stability_score,
                "max_score": 100,
                "weight": 0.1,
                "details": {
                    "consistency": task.stability_score * 0.5,
                    "compliance": task.stability_score * 0.5
                }
            }
        }
        
        # 生成建议
        recommendations = cls._generate_recommendations(task, dimensions)
        
        report = Report(
            report_code=report_code,
            task_id=task.id,
            summary={
                "total_score": round(task.total_score, 2),
                "level": task.level,
                "ranking_percentile": random.uniform(60, 99),
                "strength_areas": ["OpenClaw工具调用", "交互意图理解"] if task.tool_score > 300 else ["基础认知推理"],
                "improvement_areas": ["长文本理解"] if task.reasoning_score < 250 else ["稳定性优化"]
            },
            dimensions=dimensions,
            test_cases=[],  # TODO: 填充实际测试用例
            recommendations=recommendations,
            is_deep_report=1,  # 免费模式：所有报告都是深度报告
            unlocked_at=datetime.utcnow()  # 免费模式：立即解锁
        )
        
        db.add(report)
        db.commit()
        db.refresh(report)
        
        # 更新排行榜
        cls._update_ranking(db, task)
        
        return report
    
    @classmethod
    def _generate_recommendations(cls, task: AssessmentTask, dimensions: Dict) -> List[Dict]:
        """生成改进建议"""
        recommendations = []
        
        if task.tool_score < 300:
            recommendations.append({
                "area": "工具调用",
                "score": task.tool_score,
                "target": 350,
                "suggestions": [
                    "加强对OpenClaw工具的理解",
                    "优化工具参数填写准确性",
                    "练习多工具串联使用"
                ]
            })
        
        if task.reasoning_score < 220:
            recommendations.append({
                "area": "认知推理",
                "score": task.reasoning_score,
                "target": 250,
                "suggestions": [
                    "提升逻辑推理能力",
                    "加强数学计算准确性",
                    "优化长文本理解"
                ]
            })
        
        if task.interaction_score < 150:
            recommendations.append({
                "area": "交互理解",
                "score": task.interaction_score,
                "target": 170,
                "suggestions": [
                    "增强用户意图识别",
                    "提升情绪感知能力"
                ]
            })
        
        return recommendations
    
    @classmethod
    def _update_ranking(cls, db: Session, task: AssessmentTask):
        """更新排行榜"""
        # 查找是否已有记录
        ranking = db.query(Ranking).filter(Ranking.agent_name == task.agent_name).first()
        
        if ranking:
            # 更新最高分
            if task.total_score > ranking.total_score:
                ranking.total_score = task.total_score
                ranking.level = task.level
            ranking.task_count += 1
            ranking.updated_at = datetime.utcnow()
        else:
            # 创建新记录
            ranking = Ranking(
                agent_name=task.agent_name,
                agent_type="general",  # TODO: 从token获取
                total_score=task.total_score,
                level=task.level,
                task_count=1
            )
            db.add(ranking)
        
        db.commit()
        
        # 重新计算排名
        all_rankings = db.query(Ranking).order_by(Ranking.total_score.desc()).all()
        for i, r in enumerate(all_rankings, 1):
            r.rank = i
        db.commit()


class ReportService:
    """报告服务"""
    
    @classmethod
    def get_report_by_code(cls, db: Session, report_code: str) -> Optional[Report]:
        """通过代码获取报告"""
        return db.query(Report).filter(Report.report_code == report_code).first()
    
    @classmethod
    def get_report_by_task(cls, db: Session, task_id: str) -> Optional[Report]:
        """通过任务ID获取报告"""
        return db.query(Report).filter(Report.task_id == task_id).first()
    
    @classmethod
    def unlock_deep_report(cls, db: Session, report_id: str) -> Report:
        """解锁深度报告"""
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise ValueError("报告不存在")
        
        report.is_deep_report = 1
        report.unlocked_at = datetime.utcnow()
        db.commit()
        db.refresh(report)
        return report


class RankingService:
    """排行榜服务"""
    
    @classmethod
    def get_rankings(cls, db: Session, agent_type: Optional[str] = None, 
                     skip: int = 0, limit: int = 100) -> List[Ranking]:
        """获取排行榜"""
        query = db.query(Ranking)
        if agent_type:
            query = query.filter(Ranking.agent_type == agent_type)
        return query.order_by(Ranking.rank).offset(skip).limit(limit).all()
    
    @classmethod
    def get_agent_ranking(cls, db: Session, agent_name: str) -> Optional[Ranking]:
        """获取Agent排名"""
        return db.query(Ranking).filter(Ranking.agent_name == agent_name).first()
