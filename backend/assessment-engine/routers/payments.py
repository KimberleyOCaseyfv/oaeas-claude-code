from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas import PaymentCreate, PaymentResponse, APIResponse
from payment_manager import PaymentManager

router = APIRouter(prefix="/payments", tags=["Payments"])
payment_manager = PaymentManager()

@router.post("/create", response_model=APIResponse)
async def create_payment(
    data: PaymentCreate,
    user_id: str = "user_001",
    db: Session = Depends(get_db)
):
    """创建支付订单"""
    try:
        result = await payment_manager.create_order(
            user_id=user_id,
            task_id=data.task_id,
            report_id=data.report_id,
            channel=data.channel.value,
            currency=data.currency
        )
        
        return APIResponse(
            data={
                "order_code": result["order"]["order_code"],
                "amount": result["order"]["amount"],
                "currency": result["order"]["currency"],
                "channel": result["order"]["channel"],
                "status": result["order"]["status"],
                "qr_code_url": result["payment_info"].get("qr_code_url"),
                "pay_url": result["payment_info"].get("pay_url"),
                "client_secret": result["payment_info"].get("client_secret"),
                "expire_seconds": result["payment_info"].get("expire_seconds", 300)
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{order_code}/status", response_model=APIResponse)
async def check_payment_status(
    order_code: str,
    channel: str,
    db: Session = Depends(get_db)
):
    """查询支付状态"""
    try:
        is_paid = await payment_manager.verify_payment(order_code, channel)
        return APIResponse(data={
            "order_code": order_code,
            "paid": is_paid,
            "status": "paid" if is_paid else "pending"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/callback/{channel}", response_model=APIResponse)
async def payment_callback(
    channel: str,
    callback_data: dict,
    db: Session = Depends(get_db)
):
    """支付回调处理"""
    try:
        success = await payment_manager.handle_callback(channel, callback_data)
        if success:
            return APIResponse(message="支付成功处理")
        else:
            raise HTTPException(status_code=400, detail="支付验证失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
