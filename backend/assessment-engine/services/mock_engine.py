"""
模拟测评引擎 - 让系统立即跑起来
使用随机数据模拟真实测评结果
"""

import random
import time
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from models.database import AssessmentTask, Report, TempToken

def run_mock_assessment(db: Session, task: AssessmentTask) -> Dict[str, Any]:
    """
    运行模拟测评
    模拟4个维度的测试和评分
    """
    # 模拟测试耗时 3-5 秒
    time.sleep(random.uniform(3, 5))
    
    # 模拟4维度评分 (基于agent_id生成固定但合理的结果)
    agent_seed = hash(task.agent_id) % 1000
    
    # 工具调用 (0-400分)
    tool_score = min(400, max(200, 250 + agent_seed % 150 + random.randint(-30, 30)))
    
    # 认知推理 (0-300分)
    reasoning_score = min(300, max(150, 200 + agent_seed % 100 + random.randint(-20, 20)))
    
    # 交互理解 (0-200分)
    interaction_score = min(200, max(100, 140 + agent_seed % 60 + random.randint(-15, 15)))
    
    # 稳定性 (0-100分)
    stability_score = min(100, max(50, 70 + agent_seed % 30 + random.randint(-10, 10)))
    
    total_score = tool_score + reasoning_score + interaction_score + stability_score
    
    # 计算等级
    if total_score >= 850:
        level = "Master"
    elif total_score >= 700:
        level = "Expert"
    elif total_score >= 500:
        level = "Proficient"
    else:
        level = "Novice"
    
    # 计算排名百分位 (模拟)
    ranking_percentile = min(99, max(10, 50 + (total_score - 500) / 5))
    
    return {
        "tool_score": round(tool_score, 1),
        "reasoning_score": round(reasoning_score, 1),
        "interaction_score": round(interaction_score, 1),
        "stability_score": round(stability_score, 1),
        "total_score": round(total_score, 1),
        "level": level,
        "ranking_percentile": round(ranking_percentile, 1)
    }

def generate_free_report(task_code: str, agent_id: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """生成免费版报告"""
    # 计算百分位
    total_score = result.get("total_score", 0)
    ranking_percentile = min(99, max(10, 50 + (total_score - 500) / 5))
    
    return {
        "version": "1.0",
        "task_code": task_code,
        "agent_id": agent_id,
        "generated_at": datetime.utcnow().isoformat(),
        "score": {
            "total": result["total_score"],
            "max": 1000,
            "level": result["level"],
            "percentile": round(ranking_percentile, 1)
        },
        "summary": f"Agent {agent_id} 总体表现{result['level']}水平",
        "upgrade_prompt": "解锁深度报告查看4维度详细分析和改进建议"
    }

def generate_full_report(task_code: str, agent_id: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """生成完整深度报告"""
    dimensions = {
        "tool_usage": {
            "score": result["tool_score"],
            "max_score": 400,
            "weight": 0.4,
            "level": _get_dimension_level(result["tool_score"], 400),
            "details": {
                "tool_selection": round(result["tool_score"] * 0.3, 1),
                "parameter_filling": round(result["tool_score"] * 0.3, 1),
                "tool_chaining": round(result["tool_score"] * 0.25, 1),
                "error_correction": round(result["tool_score"] * 0.15, 1)
            }
        },
        "reasoning": {
            "score": result["reasoning_score"],
            "max_score": 300,
            "weight": 0.3,
            "level": _get_dimension_level(result["reasoning_score"], 300),
            "details": {
                "logic": round(result["reasoning_score"] * 0.35, 1),
                "math": round(result["reasoning_score"] * 0.35, 1),
                "long_text": round(result["reasoning_score"] * 0.3, 1)
            }
        },
        "interaction": {
            "score": result["interaction_score"],
            "max_score": 200,
            "weight": 0.2,
            "level": _get_dimension_level(result["interaction_score"], 200),
            "details": {
                "intent_recognition": round(result["interaction_score"] * 0.5, 1),
                "emotion_perception": round(result["interaction_score"] * 0.5, 1)
            }
        },
        "stability": {
            "score": result["stability_score"],
            "max_score": 100,
            "weight": 0.1,
            "level": _get_dimension_level(result["stability_score"], 100),
            "details": {
                "consistency": round(result["stability_score"] * 0.5, 1),
                "compliance": round(result["stability_score"] * 0.5, 1)
            }
        }
    }
    
    # 生成建议
    recommendations = _generate_recommendations(result)
    
    return {
        "version": "1.0",
        "task_code": task_code,
        "agent_id": agent_id,
        "generated_at": datetime.utcnow().isoformat(),
        "score": {
            "total": result["total_score"],
            "max": 1000,
            "level": result["level"],
            "percentile": result["ranking_percentile"]
        },
        "dimensions": dimensions,
        "recommendations": recommendations,
        "ranking": {
            "global_rank": int(1000 - result["ranking_percentile"] * 10),
            "total_agents": 1000,
            "top_percentile": round(result["ranking_percentile"], 1)
        }
    }

def _get_dimension_level(score: float, max_score: float) -> str:
    """获取维度等级"""
    ratio = score / max_score
    if ratio >= 0.85:
        return "Excellent"
    elif ratio >= 0.7:
        return "Good"
    elif ratio >= 0.5:
        return "Average"
    else:
        return "Needs Improvement"

def _generate_recommendations(result: Dict[str, Any]) -> list:
    """生成改进建议"""
    recommendations = []
    
    if result["tool_score"] < 300:
        recommendations.append({
            "area": "工具调用",
            "current_score": result["tool_score"],
            "target_score": 350,
            "priority": "High",
            "suggestions": [
                "加强对API工具的理解",
                "优化参数填写准确性",
                "练习多工具串联使用"
            ]
        })
    
    if result["reasoning_score"] < 220:
        recommendations.append({
            "area": "认知推理",
            "current_score": result["reasoning_score"],
            "target_score": 250,
            "priority": "Medium",
            "suggestions": [
                "提升逻辑推理能力",
                "加强数学计算准确性",
                "优化长文本理解"
            ]
        })
    
    if result["interaction_score"] < 150:
        recommendations.append({
            "area": "交互理解",
            "current_score": result["interaction_score"],
            "target_score": 170,
            "priority": "Medium",
            "suggestions": [
                "增强用户意图识别",
                "提升多轮对话能力"
            ]
        })
    
    if result["stability_score"] < 70:
        recommendations.append({
            "area": "稳定性",
            "current_score": result["stability_score"],
            "target_score": 80,
            "priority": "Low",
            "suggestions": [
                "优化异常处理能力",
                "增强输出一致性"
            ]
        })
    
    if not recommendations:
        recommendations.append({
            "area": "整体表现",
            "message": "表现优秀！继续保持",
            "priority": "None"
        })
    
    return recommendations
