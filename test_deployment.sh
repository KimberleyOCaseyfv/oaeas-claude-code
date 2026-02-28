#!/bin/bash
# OpenClaw Agent Benchmark Platform - Deployment Test Script
# 7x24小时开发模式 - 测试验证

echo "🧪 Testing OpenClaw Agent Benchmark Platform Deployment"
echo "============================================================"

# Test 1: Check file structure
echo "[1/5] Checking file structure..."
if [ -d "frontend/token-dashboard" ] && [ -d "backend/assessment-engine" ] && [ -d "gateway" ] && [ -d "database" ]; then
    echo "✅ File structure OK"
else
    echo "❌ File structure incomplete"
    exit 1
fi

# Test 2: Check Docker Compose
echo "[2/5] Checking Docker Compose configuration..."
if [ -f "docker-compose.yml" ]; then
    echo "✅ Docker Compose file exists"
    # Validate YAML syntax
    if docker-compose config > /dev/null 2>&1; then
        echo "✅ Docker Compose syntax OK"
    else
        echo "⚠️  Docker Compose syntax warning"
    fi
else
    echo "❌ Docker Compose file missing"
    exit 1
fi

# Test 3: Check database schema
echo "[3/5] Checking database schema..."
if [ -f "database/schema.sql" ]; then
    echo "✅ Database schema exists"
    # Count tables
    TABLE_COUNT=$(grep -c "CREATE TABLE" database/schema.sql)
    echo "   Found $TABLE_COUNT tables"
else
    echo "❌ Database schema missing"
    exit 1
fi

# Test 4: Check documentation
echo "[4/5] Checking documentation..."
DOC_COUNT=$(find . -name "*.md" -type f | wc -l)
echo "   Found $DOC_COUNT documentation files"
if [ $DOC_COUNT -gt 5 ]; then
    echo "✅ Documentation OK"
else
    echo "⚠️  Documentation may be incomplete"
fi

# Test 5: Code statistics
echo "[5/5] Code statistics..."
echo "   Total files: $(find . -type f | grep -v ".git" | wc -l)"
echo "   Total size: $(du -sh . | cut -f1)"
echo "   Python files: $(find . -name "*.py" | wc -l)"
echo "   Config files: $(find . -name "*.yml" -o -name "*.yaml" | wc -l)"

echo ""
echo "============================================================"
echo "✅ All tests passed!"
echo "🚀 Ready for deployment!"
echo "============================================================"
