from sqlalchemy.orm import Session
from ..models import AuditLog

def add_audit(db: Session, *, user, action: str, order_id: int | None = None, previous_status: str | None = None, new_status: str | None = None, details: str = ''):
    log = AuditLog(order_id=order_id, user_id=user.id, user_name=user.name, action=action, previous_status=previous_status, new_status=new_status, details=details)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
