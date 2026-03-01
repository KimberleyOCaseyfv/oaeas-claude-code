#!/bin/bash
# OAEAS - 个人收款码上传脚本
# 使用方法: ./upload_qrcodes.sh [微信收款码路径] [支付宝收款码路径]

set -e

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 目标目录
TARGET_DIR="/root/.openclaw/workspace/bounty/oaeas-claude-code/backend/assessment-engine/static/qrcodes"

echo "🚀 OAEAS 个人收款码上传工具"
echo "=============================="

# 确保目录存在
mkdir -p "$TARGET_DIR"

# 检查参数
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}使用方式:${NC}"
    echo "  ./upload_qrcodes.sh /path/to/wechat_qrcode.png /path/to/alipay_qrcode.png"
    echo ""
    echo "或者分别上传:"
    echo "  ./upload_qrcodes.sh --wechat /path/to/wechat.png"
    echo "  ./upload_qrcodes.sh --alipay /path/to/alipay.png"
    exit 1
fi

# 处理参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --wechat|-w)
            WECHAT_PATH="$2"
            shift 2
            ;;
        --alipay|-a)
            ALIPAY_PATH="$2"
            shift 2
            ;;
        *)
            # 如果没有指定flag，按顺序处理
            if [ -z "$WECHAT_PATH" ]; then
                WECHAT_PATH="$1"
            elif [ -z "$ALIPAY_PATH" ]; then
                ALIPAY_PATH="$1"
            fi
            shift
            ;;
    esac
done

# 上传微信收款码
if [ -n "$WECHAT_PATH" ]; then
    if [ -f "$WECHAT_PATH" ]; then
        cp "$WECHAT_PATH" "$TARGET_DIR/wechat_personal.png"
        echo -e "${GREEN}✅ 微信收款码已上传${NC}"
        echo "   路径: $TARGET_DIR/wechat_personal.png"
    else
        echo -e "${RED}❌ 微信收款码文件不存在: $WECHAT_PATH${NC}"
    fi
fi

# 上传支付宝收款码
if [ -n "$ALIPAY_PATH" ]; then
    if [ -f "$ALIPAY_PATH" ]; then
        cp "$ALIPAY_PATH" "$TARGET_DIR/alipay_personal.png"
        echo -e "${GREEN}✅ 支付宝收款码已上传${NC}"
        echo "   路径: $TARGET_DIR/alipay_personal.png"
    else
        echo -e "${RED}❌ 支付宝收款码文件不存在: $ALIPAY_PATH${NC}"
    fi
fi

echo ""
echo "=============================="
echo -e "${GREEN}🎉 收款码上传完成！${NC}"
echo ""
echo "下一步:"
echo "  1. 重启服务: ./start.sh"
echo "  2. 访问 http://localhost:3000 进行测试"
echo "  3. 完成测评后点击'解锁深度报告'"
echo "  4. 扫码支付后，在 http://localhost:3000/admin/payments 确认收款"
echo ""
echo "管理后台密钥: ocb_admin_2026"
