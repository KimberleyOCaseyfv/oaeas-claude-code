from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from database import init_db
from routers import tokens, assessments, reports, rankings, payments, payments_simple, auth, human_auth
from metrics import setup_metrics

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    init_db()
    print("✅ Database initialized")
    yield
    print("👋 Application shutting down")

# 创建FastAPI应用
app = FastAPI(
    title="OpenClaw Agent Benchmark Platform API",
    description="OAEAS - 5分钟极速测评Agent能力",
    version="1.0.0",
    lifespan=lifespan
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "code": 500,
            "message": "Internal server error",
            "detail": str(exc)
        }
    )

# 注册路由
app.include_router(auth.router)
app.include_router(human_auth.router)
app.include_router(tokens.router)
app.include_router(assessments.router)
app.include_router(reports.router)
app.include_router(rankings.router)
app.include_router(payments.router)
app.include_router(payments_simple.router)

# Prometheus instrumentation (exposes /metrics)
setup_metrics(app)

@app.get("/")
async def root():
    """根路径 - API信息"""
    return {
        "name": "OpenClaw Agent Benchmark Platform",
        "version": "1.0.0",
        "description": "5分钟极速测评Agent能力",
        "docs": "/docs",
        "endpoints": {
            "tokens": "/tokens",
            "assessments": "/assessments",
            "reports": "/reports",
            "rankings": "/rankings"
        }
    }

@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "service": "oaeas-api",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
