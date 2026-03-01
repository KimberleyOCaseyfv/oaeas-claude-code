# OAEAS Assessment Engine - Dockerfile with WeasyPrint
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖 + WeasyPrint依赖 + 中文字体
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    # WeasyPrint依赖
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    # 中文字体
    fonts-noto-cjk \
    fonts-noto-cjk-extra \
    fontconfig \
    # PDF生成依赖
    libfreetype6-dev \
    && fc-cache -fv \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
