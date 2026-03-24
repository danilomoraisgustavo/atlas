from pydantic import BaseModel
from typing import Optional, List, Any

class OrderItemIn(BaseModel):
    item_code: Optional[str] = None
    description: str
    item_type: str
    quantity: float = 1
    unit: str = 'UN'
    unit_price: float = 0
    total_price: float = 0
    confidence: float = 0
    need_evidence_count: int = 1
    done_evidence_count: int = 1

class OrderActionIn(BaseModel):
    justification: Optional[str] = None

class OrderUpdateParsedIn(BaseModel):
    order_number: Optional[str] = None
    issuer_name: Optional[str] = None
    issuer_cnpj: Optional[str] = None
    contractor_name: Optional[str] = None
    vehicle_plate: Optional[str] = None
    vehicle_description: Optional[str] = None
    open_date: Optional[str] = None
    close_date: Optional[str] = None
    observations: Optional[str] = None
    service_total: float = 0
    product_total: float = 0
    discount: float = 0
    charges: float = 0
    total_value: float = 0
    confidence: float = 0
    requires_review: bool = False
    items: List[OrderItemIn] = []

class OrderListFilters(BaseModel):
    status: Optional[str] = None
    plate: Optional[str] = None
    supplier_id: Optional[int] = None
