#!/bin/bash
# OAEAS 快速部署脚本
# 使用方法: ./deploy.sh [服务器IP] [域名(可选)]

set -e

SERVER_IP=${1:-}
DOMAIN=${2:-}

if [ -z "$SERVER_IP" ]; then
    echo "❌ 请提供服务器的IP地址"
    echo "使用方法: ./deploy.sh 1.2.3.4 [your-domain.com]"
    exit 1
fi

echo "🚀 OAEAS 部署脚本"
echo "=================="
echo "目标服务器: $SERVER_IP"
[ -n "$DOMAIN" ] && echo "域名: $DOMAIN"
echo ""

# 创建部署包
echo "[1/5] 创建部署包..."
tar czf oaeas-deploy.tar.gz \
    backend/ \
    frontend/ \
    database/ \
    docker-compose.yml \
    start.sh \
    .env.example \
    README.md

echo "✅ 部署包创建完成: oaeas-deploy.tar.gz"

# 上传到服务器
echo ""
echo "[2/5] 上传到服务器..."
echo "请确保你可以通过SSH连接到 $SERVER_IP"
echo "正在上传..."

# 检查是否有ssh命令
if ! command -v ssh &> /dev/null; then
    echo "⚠️  请手动上传 oaeas-deploy.tar.gz 到服务器"
    echo "   然后运行: tar xzf oaeas-deploy.tar.gz && cd oaeas-claude-code && ./start.sh"
    exit 0
fi

# 尝试上传
read -p "SSH用户名 (默认root): " SSH_USER
SSH_USER=${SSH_USER:-root}

read -p "SSH端口 (默认22): " SSH_PORT
SSH_PORT=${SSH_PORT:-22}

# 上传文件
scp -P $SSH_PORT oaeas-deploy.tar.gz $SSH_USER@$SERVER_IP:/tmp/

# 在服务器上执行部署
echo ""
echo "[3/5] 在服务器上部署..."
ssh -p $SSH_PORT $SSH_USER@$SERVER_IP << EOF
    cd /opt
    mkdir -p oaeas
    cd oaeas
    
    # 解压
    tar xzf /tmp/oaeas-deploy.tar.gz
    
    # 配置环境
    cp .env.example .env
    
    # 启动服务
    ./start.sh
EOF

echo ""
echo "[4/5] 配置防火墙..."
ssh -p $SSH_PORT $SSH_USER@$SERVER_IP "
    # 开放端口
    ufw allow 3000/tcp 2>/dev/null || true
    ufw allow 8001/tcp 2>/dev/null || true
    firewall-cmd --add-port=3000/tcp --permanent 2>/dev/null || true
    firewall-cmd --add-port=8001/tcp --permanent 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
"

echo ""
echo "[5/5] 部署完成！"
echo ""
echo "🎉 OAEAS 已成功部署到服务器！"
echo ""
echo "访问地址:"
echo "  • Token Dashboard: http://$SERVER_IP:3000"
echo "  • API Docs: http://$SERVER_IP:8001/docs"
echo ""
[ -n "$DOMAIN" ] && echo "域名配置完成后可访问: https://$DOMAIN"

echo ""
echo "测试流程:"
echo "  1. 访问 http://$SERVER_IP:3000"
echo "  2. 创建Token → 新建测评 → 查看报告 → 排行榜"
echo ""

# 清理本地部署包
rm -f oaeas-deploy.tar.gz
