from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from ..models import Notification
from ..services.notifications import manager

router = APIRouter(prefix='/notifications', tags=['Notifications'])

@router.get('')
def list_notifications(db: Session = Depends(get_db), user=Depends(get_current_user)):
    items = db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.created_at.desc()).all()
    return [{
        'id': n.id, 'title': n.title, 'message': n.message, 'category': n.category, 'read': n.read,
        'order_id': n.order_id, 'created_at': n.created_at.isoformat() if n.created_at else None
    } for n in items]

@router.websocket('/ws/{user_id}')
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
