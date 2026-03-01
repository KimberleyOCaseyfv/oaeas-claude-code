"""OAEAS V2 Assessment Router"""
import os
import secrets
import string
import hashlib
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from database import get_db
from models.database import AnonymousToken, Token, AssessmentTask, TestResult, Report, ReportHash, Ranking
from schemas import TaskCreate, TaskResponse, TaskStatusResponse, AssessmentReport, DimensionScore, APIResponse, Level

router = APIRouter(prefix="/api/v1", tags=["assessments"])

SERVER_SALT = os.getenv("SERVER_SALT", "oaeas_dev_salt")


def _resolve_bearer(authorization: Optional[str], db: Session):
    """Returns (anon_token, formal_token) from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="OCE-4001: Missing Authorization")
    val = authorization.removeprefix("Bearer ").strip()
    if val.startswith("ocb_tmp_"):
        anon = db.query(AnonymousToken).filter(AnonymousToken.token_value == val).first()
        if not anon or anon.expires_at < datetime.utcnow():
            raise HTTPException(status_code=401, detail="OCE-1001: Invalid or expired token")
        return anon, None
    # Formal token by code
    tok = db.query(Token).filter(Token.token_code == val).first()
    if not tok or tok.status != "active":
        raise HTTPException(status_code=401, detail="OCE-1002: Invalid or inactive token")
    return None, tok


def _make_task_code() -> str:
    ts   = datetime.now().strftime("%Y%m%d")
    rand = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
    return f"OCBT-{ts}{rand}"


def _generate_seed(task_id: str, agent_id: str, salt: str) -> int:
    import time
    ts  = str(int(time.time() * 1000))
    raw = f"{task_id}:{agent_id}:{ts}:{salt}"
    h   = hashlib.sha256(raw.encode()).hexdigest()
    return int(h[:16], 16)


def _calculate_level(total: float) -> str:
    if total >= 850: return Level.MASTER.value
    if total >= 700: return Level.EXPERT.value
    if total >= 500: return Level.PROFICIENT.value
    return Level.NOVICE.value


def _make_report_code() -> str:
    ts   = datetime.now().strftime("%Y%m%d")
    rand = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
    return f"OCR-{ts}{rand}"


def _hash_payload(data: dict) -> str:
    import json
    canonical = json.dumps(data, sort_keys=True, ensure_ascii=False, default=str)
    return "sha256:" + hashlib.sha256(canonical.encode()).hexdigest()


def _run_assessment_background(task_id: str, db_url: str):
    """Background assessment runner - imports engine lazily to avoid circular imports."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(db_url)
    LocalSession = sessionmaker(bind=engine)
    db = LocalSession()
    try:
        _execute_assessment(task_id, db)
    finally:
        db.close()
        engine.dispose()


def _execute_assessment(task_id: str, db: Session):
    """Core assessment logic executed in background."""
    task = db.query(AssessmentTask).filter(AssessmentTask.id == task_id).first()
    if not task:
        return

    task.status = "running"
    task.started_at = datetime.utcnow()
    db.commit()

    try:
        from services.case_generator import CaseGenerator
        from services.tool_sandbox import ToolSandbox
        from services.scoring_engine import ScoringEngine

        rng      = __import__("random").Random(task.seed or 42)
        gen      = CaseGenerator(task.seed or 42)
        sandbox  = ToolSandbox(task.seed or 42)
        scorer   = ScoringEngine()

        all_cases = gen.generate_all_cases()
        results   = []
        veto      = False

        phase_map = {
            "tool_usage": 1,
            "reasoning": 2,
            "interaction": 3,
            "stability": 4,
        }

        for dimension, cases in all_cases.items():
            task.phase = phase_map.get(dimension, 0)
            db.commit()

            for case in cases:
                # Simulate calling the agent (mock mode or real endpoint)
                agent_response = _call_agent(task, case, sandbox, rng)

                # Score
                if dimension == "tool_usage":
                    score = scorer.score_tool_usage(case, agent_response)
                    veto_flag = False
                elif dimension == "reasoning":
                    score = scorer.score_reasoning(case, agent_response)
                    veto_flag = False
                elif dimension == "interaction":
                    score = scorer.score_interaction(case, agent_response)
                    veto_flag = False
                else:  # stability
                    score, veto_flag = scorer.score_stability(case, agent_response)

                if veto_flag:
                    veto = True
                    task.veto_triggered = True
                    task.veto_reason = f"Compliance violation on case {case['case_id']}"
                    task.status = "aborted"
                    task.total_score = 0
                    task.completed_at = datetime.utcnow()
                    task.duration_seconds = int((task.completed_at - task.started_at).total_seconds())
                    db.commit()
                    return

                results.append({
                    "dimension": dimension,
                    "case_id": case["case_id"],
                    "difficulty": case["difficulty"],
                    "score": score,
                    "max_score": case["max_score"],
                    "response_time_ms": agent_response.get("response_time_ms", 500),
                })
                task.cases_completed += 1
                db.commit()

        # Tally dimension scores
        dim_totals = scorer.calculate_dimension_totals(results)

        task.tool_score      = dim_totals["tool_usage"]["score"]
        task.reasoning_score = dim_totals["reasoning"]["score"]
        task.interaction_score = dim_totals["interaction"]["score"]
        task.stability_score = dim_totals["stability"]["score"]
        task.total_score     = sum(v["score"] for v in dim_totals.values())
        task.level           = _calculate_level(float(task.total_score))
        task.status          = "completed"
        task.completed_at    = datetime.utcnow()
        task.duration_seconds = int((task.completed_at - task.started_at).total_seconds())
        db.commit()

        # Generate report
        _create_report(task, dim_totals, results, scorer, db)

        # Fire webhook (non-blocking best-effort)
        if task.webhook_url:
            _fire_webhook(task)

    except Exception as exc:
        task.status = "failed"
        task.veto_reason = str(exc)[:512]
        db.commit()
        if task.webhook_url:
            _fire_webhook(task, failed=True)
        raise


def _fire_webhook(task, failed: bool = False):
    """Send a best-effort POST to the task's webhook_url."""
    import httpx
    try:
        payload = {
            "event": "assessment.failed" if failed else "assessment.completed",
            "task_id": str(task.id),
            "task_code": task.task_code,
            "agent_id": task.agent_id,
            "status": task.status,
            "total_score": float(task.total_score or 0),
            "level": task.level,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        }
        httpx.post(task.webhook_url, json=payload, timeout=5.0)
    except Exception:
        pass  # webhook failures must never crash the assessment


def _call_agent(task, case: dict, sandbox: "ToolSandbox", rng) -> dict:
    """
    Calls the agent with the case prompt.
    - If endpoint_url is None/"mock" → use built-in mock agent
    - Otherwise → call the real HTTP endpoint (simplified for test env)
    """
    import time
    start = time.time()

    endpoint = task.endpoint_url or "mock"
    if endpoint in ("mock", "", None):
        response = _mock_agent_response(case, sandbox, rng)
    else:
        # Real HTTP call (simplified)
        response = _http_agent_call(task, case)

    response["response_time_ms"] = int((time.time() - start) * 1000) or rng.randint(200, 2000)
    return response


def _mock_agent_response(case: dict, sandbox: "ToolSandbox", rng) -> dict:
    """Built-in mock agent that produces realistic (but seeded-random) responses."""
    dimension = case.get("dimension", "")
    expected_tool = case.get("expected_tool")
    expected_answer = case.get("expected_answer", "")
    is_dark = case.get("is_dark_case", False)

    # Dark cases: mock agent correctly refuses
    if is_dark:
        return {
            "type": "refusal",
            "content": "I'm sorry, but I cannot fulfill that request as it violates my guidelines.",
            "tool_calls": [],
        }

    # Simulate agent quality: 70-95% accuracy based on difficulty
    accuracy = {"easy": 0.92, "medium": 0.78, "hard": 0.62}.get(case["difficulty"], 0.78)
    is_correct = rng.random() < accuracy

    if dimension == "tool_usage" and expected_tool:
        if is_correct:
            # Correct tool call
            params = _mock_tool_params(expected_tool, case["prompt"], rng)
            result = sandbox.execute(expected_tool, params, "mock_task", case["case_id"])
            return {
                "type": "tool_call",
                "tool_calls": [{"tool": expected_tool, "params": params}],
                "tool_results": [result],
                "content": f"I used {expected_tool} and got: {result.get('result', '')}",
            }
        else:
            # Wrong tool or bad params
            wrong_tools = ["web_search", "calculator", "weather_query"]
            wrong = rng.choice([t for t in wrong_tools if t != expected_tool])
            return {
                "type": "tool_call",
                "tool_calls": [{"tool": wrong, "params": {}}],
                "content": "Let me look that up...",
            }

    elif dimension == "reasoning":
        if is_correct:
            return {"type": "text", "content": expected_answer or "42", "tool_calls": []}
        else:
            # Wrong answer
            return {"type": "text", "content": str(rng.randint(1, 1000)), "tool_calls": []}

    elif dimension == "interaction":
        if is_correct:
            return {
                "type": "text",
                "content": "I understand your concern. Let me help you with empathy and clarity.",
                "tool_calls": [],
            }
        else:
            return {"type": "text", "content": "Sure, here's the answer.", "tool_calls": []}

    else:  # stability
        return {
            "type": "text",
            "content": expected_answer or "I will maintain consistency in my responses.",
            "tool_calls": [],
        }


def _mock_tool_params(tool_name: str, prompt: str, rng) -> dict:
    """Generate plausible tool parameters from the prompt."""
    cities = ["Beijing", "Shanghai", "Tokyo", "London", "New York", "Paris"]
    if tool_name == "weather_query":
        return {"city": rng.choice(cities), "date": "today"}
    elif tool_name == "calculator":
        ops = ["2 + 2", "100 * 3.14", "sqrt(144)", "2 ** 10"]
        return {"expression": rng.choice(ops)}
    elif tool_name == "web_search":
        return {"query": prompt[:50], "max_results": 3}
    elif tool_name == "file_read":
        return {"path": "/sandbox/task/data.txt"}
    elif tool_name == "file_write":
        return {"path": "/sandbox/task/output.txt", "content": "result data"}
    elif tool_name == "database_query":
        return {"sql": "SELECT * FROM records LIMIT 5"}
    elif tool_name == "http_request":
        return {"url": "https://api.example.com/data", "method": "GET"}
    elif tool_name == "translate":
        return {"text": "Hello world", "from_lang": "en", "to_lang": "zh"}
    elif tool_name == "sentiment_analyze":
        return {"text": prompt[:100]}
    return {}


def _http_agent_call(task, case: dict) -> dict:
    """Call the real agent endpoint using the appropriate protocol adapter."""
    import httpx
    from services.protocol_adapters import get_adapter

    adapter = get_adapter(getattr(task, "agent_protocol", "http") or "http")
    try:
        body, headers = adapter.build_request(task, case)
        resp = httpx.post(task.endpoint_url, json=body, headers=headers, timeout=15.0)
        resp.raise_for_status()
        return adapter.parse_response(resp.json())
    except httpx.TimeoutException:
        return {"type": "error", "content": "Agent endpoint timed out (>15s)", "tool_calls": []}
    except httpx.HTTPStatusError as exc:
        return {"type": "error", "content": f"HTTP {exc.response.status_code}", "tool_calls": []}
    except Exception as exc:
        return {"type": "error", "content": str(exc)[:256], "tool_calls": []}


def _calculate_percentile(total: float, db: Session) -> float:
    """Calculate the agent's percentile rank based on all completed tasks."""
    from sqlalchemy import func
    lower_count = db.query(func.count(AssessmentTask.id)).filter(
        AssessmentTask.status == "completed",
        AssessmentTask.total_score < total,
    ).scalar() or 0
    total_count = db.query(func.count(AssessmentTask.id)).filter(
        AssessmentTask.status == "completed",
    ).scalar() or 1
    return round(min(99.9, max(0.1, (lower_count / total_count) * 100)), 1)


def _create_report(task, dim_totals: dict, results: list, scorer, db: Session):
    """Generate and persist the assessment report."""
    report_code = _make_report_code()
    total = float(task.total_score)
    percentile = _calculate_percentile(total, db)

    strengths = []
    improvements = []
    for dim, vals in dim_totals.items():
        pct = vals["score"] / vals["max"] * 100 if vals["max"] else 0
        if pct >= 75:
            strengths.append(dim.replace("_", " ").title())
        elif pct < 60:
            improvements.append(dim.replace("_", " ").title())

    summary_data = {
        "total_score": round(total, 2),
        "level": task.level,
        "percentile": round(percentile, 1),
        "ranking_percentile": round(percentile, 1),   # alias for frontend
        "strength_areas": strengths or ["General Performance"],
        "improvement_areas": improvements or [],
    }

    dimensions_data = {
        dim: {
            "score": round(vals["score"], 2),
            "max_score": vals["max"],
            "percentage": round(vals["score"] / vals["max"] * 100, 1) if vals["max"] else 0,
        }
        for dim, vals in dim_totals.items()
    }

    recommendations = scorer.generate_recommendations(dim_totals)

    bot_payload = {
        "report_code": report_code,
        "task_code": task.task_code,
        "total_score": round(total, 2),
        "level": task.level,
        "percentile": round(percentile, 1),
        "ranking_percentile": round(percentile, 1),
        "scores": dimensions_data,
        "summary": summary_data,
        "assessment_meta": {
            "duration_seconds": task.duration_seconds,
            "cases_completed": task.cases_completed,
            "timeout_count": task.timeout_count,
            "veto_triggered": task.veto_triggered,
        },
    }

    report_hash = _hash_payload(bot_payload)
    bot_payload["report_hash"] = report_hash

    report = Report(
        report_code=report_code,
        task_id=task.id,
        summary=summary_data,
        dimensions=dimensions_data,
        test_cases=results,
        recommendations=recommendations,
        is_deep_report=0,
        report_hash=report_hash,
        bot_payload=bot_payload,
    )
    db.add(report)
    db.flush()

    db.add(ReportHash(
        report_id=report.id,
        hash_value=report_hash,
        payload_size=len(str(bot_payload)),
    ))

    _update_ranking(task, db)
    db.commit()


def _update_ranking(task, db: Session):
    ranking = db.query(Ranking).filter(Ranking.agent_id == task.agent_id).first()
    if ranking:
        if float(task.total_score) > float(ranking.total_score):
            ranking.total_score = task.total_score
            ranking.level = task.level
        ranking.task_count += 1
        ranking.updated_at = datetime.utcnow()
    else:
        ranking = Ranking(
            agent_id=task.agent_id,
            agent_name=task.agent_name,
            agent_type="general",
            protocol=task.agent_protocol,
            total_score=task.total_score,
            level=task.level,
            task_count=1,
        )
        db.add(ranking)
    db.flush()
    all_r = db.query(Ranking).order_by(Ranking.total_score.desc()).all()
    for i, r in enumerate(all_r, 1):
        r.rank = i
    db.flush()


# ── API Endpoints ─────────────────────────────────────────────────────────────

@router.post("/tasks", response_model=APIResponse, status_code=201)
def create_task(
    body: TaskCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Create an assessment task (requires anonymous or formal token)."""
    authorization = request.headers.get("Authorization")
    anon, formal = _resolve_bearer(authorization, db)

    if anon and anon.used:
        raise HTTPException(status_code=409, detail="OCE-2001: This anonymous token has already been used")

    task = AssessmentTask(
        task_code=_make_task_code(),
        anon_token_id=anon.id if anon else None,
        token_id=formal.id if formal else None,
        agent_id=body.agent_id,
        agent_name=body.agent_name,
        agent_protocol=body.protocol_config.protocol.value,
        endpoint_url=body.protocol_config.endpoint_url,
        auth_header=body.protocol_config.auth_header,
        webhook_url=body.webhook_url,
    )
    db.add(task)
    db.flush()

    task.seed = _generate_seed(str(task.id), body.agent_id, SERVER_SALT)

    if anon:
        anon.used = True
        anon.task_id = task.id

    db.commit()
    db.refresh(task)

    return APIResponse(
        success=True,
        data={
            "task_id": str(task.id),
            "task_code": task.task_code,
            "status": task.status,
            "estimated_duration_seconds": 300,
            "phases": ["tool_usage", "reasoning", "interaction", "stability"],
            "created_at": task.created_at.isoformat(),
        },
    )


@router.post("/tasks/{task_id}/start", response_model=APIResponse)
def start_task(
    task_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Start running an assessment task (async in background)."""
    task = db.query(AssessmentTask).filter(AssessmentTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="OCE-2002: Task not found")
    if task.status != "pending":
        raise HTTPException(status_code=409, detail=f"OCE-2003: Task is already in status '{task.status}'")

    db_url = os.getenv("DATABASE_URL", "postgresql://ocbuser:ocbpassword123@postgres:5432/ocbenchmark")
    background_tasks.add_task(_run_assessment_background, str(task.id), db_url)

    return APIResponse(
        success=True,
        data={
            "task_id": str(task.id),
            "status": "running",
            "started_at": datetime.utcnow().isoformat(),
            "deadline": (datetime.utcnow().__class__.utcnow() if False else datetime.utcnow()).isoformat(),
            "message": "Assessment started. Poll /status or await webhook.",
        },
    )


@router.get("/tasks/{task_id}/status", response_model=APIResponse)
def get_task_status(task_id: str, db: Session = Depends(get_db)):
    """Poll assessment task status."""
    task = db.query(AssessmentTask).filter(AssessmentTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="OCE-2002: Task not found")

    return APIResponse(
        success=True,
        data={
            "task_id": str(task.id),
            "task_code": task.task_code,
            "status": task.status,
            "phase": task.phase,
            "progress": {
                "cases_completed": task.cases_completed,
                "cases_total": task.cases_total,
                "elapsed_seconds": (
                    int((datetime.utcnow() - task.started_at).total_seconds())
                    if task.started_at else 0
                ),
            },
        },
    )


@router.get("/tasks/{task_id}/report", response_model=APIResponse)
def get_task_report(task_id: str, db: Session = Depends(get_db)):
    """Get the (basic) assessment report for a completed task."""
    task = db.query(AssessmentTask).filter(AssessmentTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="OCE-2002: Task not found")
    if task.status not in ("completed", "aborted"):
        raise HTTPException(status_code=202, detail=f"OCE-2004: Task not yet complete (status={task.status})")

    report = db.query(Report).filter(Report.task_id == task.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="OCE-2005: Report not yet generated")

    return APIResponse(
        success=True,
        data=report.bot_payload,
    )


@router.get("/tasks", response_model=APIResponse)
def list_tasks(
    limit: int = 20,
    offset: int = 0,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List recent assessment tasks (newest first)."""
    q = db.query(AssessmentTask)
    if status:
        q = q.filter(AssessmentTask.status == status)
    tasks = q.order_by(AssessmentTask.created_at.desc()).offset(offset).limit(limit).all()

    return APIResponse(
        success=True,
        data=[
            {
                "task_id": str(t.id),
                "task_code": t.task_code,
                "agent_id": t.agent_id,
                "agent_name": t.agent_name,
                "status": t.status,
                "total_score": float(t.total_score) if t.total_score is not None else None,
                "level": t.level,
                "cases_completed": t.cases_completed,
                "cases_total": t.cases_total,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            }
            for t in tasks
        ],
    )
