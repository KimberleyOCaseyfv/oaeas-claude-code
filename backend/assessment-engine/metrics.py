"""
metrics.py
==========
Prometheus instrumentation for the OAEAS assessment engine.

Exposes:
  GET /metrics   – standard Prometheus scrape endpoint

Custom counters / histograms:
  oaeas_tasks_total{status}           – completed / failed / aborted tasks
  oaeas_task_duration_seconds         – histogram of task duration
  oaeas_veto_total                    – compliance vetoes triggered
  oaeas_l4_consistency_rate           – histogram of L4 consistency %
  oaeas_tokens_created_total          – tokens issued
  oaeas_reports_created_total         – reports generated
"""

from prometheus_client import (
    Counter, Histogram, make_asgi_app, CONTENT_TYPE_LATEST,
    CollectorRegistry, generate_latest,
)
from fastapi import FastAPI, Request, Response
from fastapi.routing import APIRoute


# ---------------------------------------------------------------------------
# Metric definitions
# ---------------------------------------------------------------------------

_TASKS_TOTAL = Counter(
    "oaeas_tasks_total",
    "Number of assessment tasks by final status",
    ["status"],
)

_TASK_DURATION = Histogram(
    "oaeas_task_duration_seconds",
    "Duration of completed assessment tasks in seconds",
    buckets=[30, 60, 120, 180, 300, 600, 900],
)

_VETO_TOTAL = Counter(
    "oaeas_veto_total",
    "Number of compliance veto events triggered",
)

_L4_CONSISTENCY = Histogram(
    "oaeas_l4_consistency_rate",
    "L4 anti-cheat consistency rate per task (0–100)",
    buckets=[0, 33, 50, 67, 80, 100],
)

_TOKENS_CREATED = Counter(
    "oaeas_tokens_created_total",
    "Number of assessment tokens created",
)

_REPORTS_CREATED = Counter(
    "oaeas_reports_created_total",
    "Number of assessment reports generated",
)

_HTTP_REQUESTS = Counter(
    "oaeas_http_requests_total",
    "Total HTTP requests by method and status code",
    ["method", "status_code"],
)

_HTTP_DURATION = Histogram(
    "oaeas_http_request_duration_seconds",
    "HTTP request latency",
    ["method", "path"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
)


# ---------------------------------------------------------------------------
# Public helpers called from the assessment engine
# ---------------------------------------------------------------------------

def record_task_completed(duration_seconds: float, l4_rate: float):
    _TASKS_TOTAL.labels(status="completed").inc()
    _TASK_DURATION.observe(duration_seconds)
    _L4_CONSISTENCY.observe(l4_rate)


def record_task_failed():
    _TASKS_TOTAL.labels(status="failed").inc()


def record_task_aborted(veto: bool = True):
    _TASKS_TOTAL.labels(status="aborted").inc()
    if veto:
        _VETO_TOTAL.inc()


def record_token_created():
    _TOKENS_CREATED.inc()


def record_report_created():
    _REPORTS_CREATED.inc()


# ---------------------------------------------------------------------------
# FastAPI integration
# ---------------------------------------------------------------------------

def setup_metrics(app: FastAPI) -> None:
    """Attach Prometheus middleware + /metrics endpoint to a FastAPI app."""

    @app.middleware("http")
    async def _prometheus_middleware(request: Request, call_next):
        import time
        path = request.url.path
        method = request.method
        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start
        _HTTP_REQUESTS.labels(method=method, status_code=str(response.status_code)).inc()
        # Only track latency for API paths (skip /metrics itself to avoid bias)
        if not path.startswith("/metrics"):
            _HTTP_DURATION.labels(method=method, path=path).observe(duration)
        return response

    @app.get("/metrics", include_in_schema=False)
    async def metrics_endpoint():
        """Prometheus scrape endpoint."""
        data = generate_latest()
        return Response(content=data, media_type=CONTENT_TYPE_LATEST)
