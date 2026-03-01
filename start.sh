#!/bin/bash
# OpenClaw Agent Benchmark Platform - Quick Start Script
# 一键启动开发环境

set -e

echo "🚀 OpenClaw Agent Benchmark Platform - Quick Start"
echo "============================================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"

# Create environment file if not exists
if [ ! -f .env ]; then
    echo "[1/4] Creating environment configuration..."
    cat > .env << EOF
# Database
DB_PASSWORD=ocbpassword123
MONGO_PASSWORD=ocbpassword123

# API Keys
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-your_api_key_here}
JWT_SECRET=ocbjwtsecret2026

# MinIO
MINIO_PASSWORD=ocbminio123

# Grafana
GRAFANA_PASSWORD=ocbdashboard

# Environment
ENV=development
EOF
    echo -e "${GREEN}✅ Environment file created (.env)${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env and add your Anthropic API Key${NC}"
else
    echo -e "${GREEN}✅ Environment file already exists${NC}"
fi

# Pull images
echo "[2/4] Pulling Docker images..."
docker-compose pull

# Start services
echo "[3/4] Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "[4/4] Waiting for services to be ready..."
sleep 10

# Check service health
echo "Checking service health..."

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U ocbuser -d ocbenchmark > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
else
    echo -e "${YELLOW}⏳ PostgreSQL is starting...${NC}"
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is ready${NC}"
else
    echo -e "${YELLOW}⏳ Redis is starting...${NC}"
fi

# Check Kong
if curl -s http://localhost:8000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Kong Gateway is ready${NC}"
else
    echo -e "${YELLOW}⏳ Kong Gateway is starting...${NC}"
fi

echo ""
echo "============================================================"
echo -e "${GREEN}🎉 OpenClaw Agent Benchmark Platform is starting!${NC}"
echo "============================================================"
echo ""
echo "📊 Service URLs:"
echo "  • Token Dashboard:    http://localhost:3000"
echo "  • Assessment Engine:  http://localhost:8002"
echo "  • Kong Gateway:       http://localhost:8000"
echo "  • Kong Admin:         http://localhost:8001"
echo "  • MinIO Console:      http://localhost:9001"
echo "  • Grafana Dashboard:  http://localhost:3001"
echo "  • Prometheus:         http://localhost:9090"
echo ""
echo "📝 Default Credentials:"
echo "  • MinIO: ocbminio / ocbminio123"
echo "  • Grafana: admin / ocbdashboard"
echo ""
echo "🛠️  Useful Commands:"
echo "  • View logs:          docker-compose logs -f"
echo "  • Stop services:      docker-compose down"
echo "  • Restart services:   docker-compose restart"
echo "  • Check status:       docker-compose ps"
echo ""
echo "============================================================"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo "============================================================"
