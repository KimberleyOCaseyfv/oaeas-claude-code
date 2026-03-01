import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database import get_db, Base
from models.database import Token, AssessmentTask, Report, Ranking
from services.assessment_service import TokenService, AssessmentService, ReportService, RankingService
from schemas import TokenCreate, AssessmentCreate, AgentType

# 测试数据库配置
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建测试数据库表
Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

# ============== Fixtures ==============

@pytest.fixture
def db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def sample_token(db):
    """创建测试Token"""
    token = TokenService.create_token(
        db,
        user_id="test_user",
        data=TokenCreate(
            name="Test Token",
            description="For testing",
            agent_type=AgentType.GENERAL,
            max_uses=10
        )
    )
    return token

@pytest.fixture
def sample_task(db, sample_token):
    """创建测试任务"""
    task = AssessmentService.create_assessment(
        db,
        data=AssessmentCreate(
            token_code=sample_token.token_code,
            agent_id="test_agent_001",
            agent_name="Test Agent"
        )
    )
    return task

# ============== API Tests ==============

class TestHealth:
    def test_health_check(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["code"] == 200
        assert response.json()["data"]["status"] == "healthy"

    def test_root_endpoint(self):
        response = client.get("/")
        assert response.status_code == 200
        assert "OpenClaw Agent Benchmark" in response.json()["data"]["name"]

class TestTokens:
    def test_create_token(self):
        response = client.post("/tokens", json={
            "name": "API Test Token",
            "description": "Created via API test",
            "agent_type": "coding",
            "max_uses": 50
        })
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["name"] == "API Test Token"
        assert data["token_code"].startswith("OCB-")
        assert data["agent_type"] == "coding"

    def test_list_tokens(self):
        # 先创建一个token
        client.post("/tokens", json={
            "name": "List Test Token",
            "agent_type": "general"
        })
        
        response = client.get("/tokens")
        assert response.status_code == 200
        assert isinstance(response.json()["data"], list)

    def test_get_token(self, sample_token):
        response = client.get(f"/tokens/{sample_token.token_code}")
        assert response.status_code == 200
        assert response.json()["data"]["token_code"] == sample_token.token_code

    def test_get_nonexistent_token(self):
        response = client.get("/tokens/OCB-XXXX-XXXX")
        assert response.status_code == 404

    def test_validate_token(self, sample_token):
        response = client.post(f"/tokens/{sample_token.token_code}/validate")
        assert response.status_code == 200
        assert response.json()["data"]["valid"] is True

class TestAssessments:
    def test_create_assessment(self, sample_token):
        response = client.post(f"/tokens/{sample_token.token_code}/assessments", json={
            "token_code": sample_token.token_code,
            "agent_id": "agent_api_test",
            "agent_name": "API Test Agent"
        })
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["task_code"].startswith("OCBT-")
        assert data["status"] == "pending"

    def test_create_assessment_invalid_token(self):
        response = client.post("/tokens/OCB-INVALID/assessments", json={
            "token_code": "OCB-INVALID",
            "agent_id": "agent_test",
            "agent_name": "Test"
        })
        assert response.status_code == 400

    def test_get_assessment(self, sample_task):
        response = client.get(f"/assessments/{sample_task.task_code}")
        assert response.status_code == 200
        assert response.json()["data"]["task_code"] == sample_task.task_code

    def test_get_assessment_status(self, sample_task):
        response = client.get(f"/assessments/{sample_task.id}/status")
        assert response.status_code == 200
        assert response.json()["data"]["status"] == "pending"

class TestReports:
    def test_get_report(self, db, sample_task):
        # 先运行测评生成报告
        AssessmentService.run_assessment(db, sample_task.id)
        
        # 获取报告
        report = ReportService.get_report_by_task(db, sample_task.id)
        response = client.get(f"/reports/{report.report_code}")
        assert response.status_code == 200
        assert response.json()["data"]["task_id"] == sample_task.id

    def test_get_report_by_task(self, db, sample_task):
        AssessmentService.run_assessment(db, sample_task.id)
        
        response = client.get(f"/reports/task/{sample_task.id}")
        assert response.status_code == 200

class TestRankings:
    def test_get_rankings(self, db, sample_task):
        # 运行测评以生成排名
        AssessmentService.run_assessment(db, sample_task.id)
        
        response = client.get("/rankings")
        assert response.status_code == 200
        data = response.json()["data"]
        assert isinstance(data, list)
        if len(data) > 0:
            assert "rank" in data[0]
            assert "agent_name" in data[0]

    def test_get_agent_ranking(self, db, sample_task):
        AssessmentService.run_assessment(db, sample_task.id)
        
        response = client.get(f"/rankings/agent/{sample_task.agent_name}")
        assert response.status_code == 200
        assert response.json()["data"]["agent_name"] == sample_task.agent_name

    def test_get_nonexistent_agent_ranking(self):
        response = client.get("/rankings/agent/NonExistentAgent")
        assert response.status_code == 404

# ============== Service Tests ==============

class TestTokenService:
    def test_generate_token_code(self):
        code = TokenService.generate_token_code()
        assert code.startswith("OCB-")
        assert len(code) == 13  # OCB-XXXX-XXXX

    def test_validate_valid_token(self, db, sample_token):
        is_valid, error = TokenService.validate_token(db, sample_token.token_code)
        assert is_valid is True
        assert error is None

    def test_validate_invalid_token(self, db):
        is_valid, error = TokenService.validate_token(db, "OCB-INVALID")
        assert is_valid is False
        assert error is not None

class TestAssessmentService:
    def test_generate_task_code(self):
        code = AssessmentService.generate_task_code()
        assert code.startswith("OCBT-")
        assert len(code) == 18  # OCBT-YYYYMMDDXXXX

    def test_calculate_level(self):
        assert AssessmentService.calculate_level(900) == "Master"
        assert AssessmentService.calculate_level(750) == "Expert"
        assert AssessmentService.calculate_level(600) == "Proficient"
        assert AssessmentService.calculate_level(400) == "Novice"

    def test_run_assessment(self, db, sample_task):
        result = AssessmentService.run_assessment(db, sample_task.id)
        assert result.status == "completed"
        assert result.total_score > 0
        assert result.level is not None

# ============== Run Tests ==============

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
