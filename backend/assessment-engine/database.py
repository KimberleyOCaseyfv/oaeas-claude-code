from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models.database import Base
import os

# Database configuration - 使用容器名而不是localhost
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ocbuser:ocbpassword123@ocb-postgres:5432/ocbenchmark"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Session:
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """初始化数据库（创建所有表）"""
    Base.metadata.create_all(bind=engine)
