from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from schemas import APIResponse
from models.database import PaymentOrder, Report
from datetime import datetime
import uuid
import base64

router = APIRouter(prefix="/payments-simple", tags=["Simple Payments"])

@router.post("/create", response_model=APIResponse)
def create_simple_payment(
    report_id: str,
    channel: str,  # wechat_personal / alipay_personal
    db: Session = Depends(get_db)
):
    """
    创建个人收款码支付订单
    返回收款码图片URL和订单号
    """
    # 生成订单号
    order_code = f"OCBP{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4]}"
    
    # 创建订单
    order = PaymentOrder(
        order_code=order_code,
        user_id="user_001",  # TODO: 从JWT获取
        report_id=report_id,
        amount=9.90,
        currency="CNY",
        channel=channel,
        status="pending"
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    
    # 收款码URL（静态文件，需要手动上传）
    qr_code_url = f"/static/qrcodes/{channel}.png"
    
    return APIResponse(data={
        "order_code": order_code,
        "amount": 9.90,
        "currency": "CNY",
        "channel": channel,
        "status": "pending",
        "qr_code_url": qr_code_url,
        "instructions": [
            "1. 保存上方收款码图片",
            "2. 使用微信/支付宝扫码支付 ¥9.90",
            "3. 备注填写订单号: " + order_code,
            "4. 支付完成后点击'我已支付'按钮",
            "5. 等待管理员确认后解锁报告"
        ],
        "expire_minutes": 30
    })

@router.post("/{order_code}/confirm", response_model=APIResponse)
def confirm_payment_manually(
    order_code: str,
    admin_key: str,  # 简单的管理员密钥验证
    db: Session = Depends(get_db)
):
    """
    管理员确认收款（手动）
    实际场景中可以通过: 查看微信/支付宝账单 -> 找到对应订单 -> 点击确认
    """
    # 简单密钥验证（生产环境应使用更安全的方案）
    if admin_key != "ocb_admin_2026":
        raise HTTPException(status_code=403, detail="无效的密钥")
    
    order = db.query(PaymentOrder).filter(PaymentOrder.order_code == order_code).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if order.status == "paid":
        return APIResponse(message="订单已支付")
    
    # 更新订单状态
    order.status = "paid"
    order.paid_at = datetime.utcnow()
    
    # 解锁报告
    report = db.query(Report).filter(Report.id == order.report_id).first()
    if report:
        report.is_deep_report = 1
        report.unlocked_at = datetime.utcnow()
    
    db.commit()
    
    return APIResponse(
        message="支付确认成功，报告已解锁",
        data={
            "order_code": order_code,
            "status": "paid",
            "report_id": order.report_id
        }
    )

@router.get("/{order_code}/status", response_model=APIResponse)
def get_payment_status(
    order_code: str,
    db: Session = Depends(get_db)
):
    """查询支付状态"""
    order = db.query(PaymentOrder).filter(PaymentOrder.order_code == order_code).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    return APIResponse(data={
        "order_code": order_code,
        "status": order.status,
        "amount": order.amount,
        "paid_at": order.paid_at.isoformat() if order.paid_at else None
    })

@router.post("/upload-qrcode")
def upload_qrcode(
    channel: str,  # wechat_personal / alipay_personal
    file: UploadFile = File(...),
    admin_key: str = ""
):
    """
    上传个人收款码图片
    仅管理员可调用
    """
    if admin_key != "ocb_admin_2026":
        raise HTTPException(status_code=403, detail="无效的密钥")
    
    # 保存文件
    file_path = f"/app/static/qrcodes/{channel}.png"
    with open(file_path, "wb") as f:
        content = file.file.read()
        f.write(content)
    
    return APIResponse(
        message="收款码上传成功",
        data={"channel": channel, "path": file_path}
    )
