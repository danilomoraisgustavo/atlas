from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import require_roles
from ..models import User, AuditLog

router = APIRouter(prefix='/admin', tags=['Admin'])

@router.get('/users')
def list_users(db: Session = Depends(get_db), user=Depends(require_roles('gestor','admin'))):
    items = db.query(User).order_by(User.name).all()
    return [{
        'id': u.id, 'name': u.name, 'email': u.email, 'role': u.role, 'active': u.active,
        'permissions': u.permissions.split(',') if u.permissions else []
    } for u in items]


@router.put('/users/{user_id}')
def update_user(user_id: int, payload: dict, db: Session = Depends(get_db), user=Depends(require_roles('gestor'))):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, 'Usuário não encontrado')

    email = (payload.get('email') or '').strip().lower()
    name = (payload.get('name') or '').strip()
    role = (payload.get('role') or '').strip()
    permissions = payload.get('permissions') or []

    if not name or not email or not role:
        raise HTTPException(400, 'Nome, e-mail e perfil são obrigatórios')

    duplicate = db.query(User).filter(User.email == email, User.id != user_id).first()
    if duplicate:
        raise HTTPException(400, 'Já existe outro usuário com este e-mail')

    target.name = name
    target.email = email
    target.role = role
    target.active = bool(payload.get('active', target.active))
    target.permissions = ','.join([permission.strip() for permission in permissions if permission.strip()])
    db.commit()
    db.refresh(target)

    return {
        'id': target.id,
        'name': target.name,
        'email': target.email,
        'role': target.role,
        'active': target.active,
        'permissions': target.permissions.split(',') if target.permissions else [],
    }

@router.get('/audit')
def list_audit(
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    user=Depends(require_roles('gestor','admin','fiscal'))
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 50)
    query = db.query(AuditLog).order_by(AuditLog.timestamp.desc())
    total = query.count()
    logs = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        'items': [{
            'id': l.id, 'order_id': l.order_id, 'user_name': l.user_name, 'action': l.action, 'previous_status': l.previous_status,
            'new_status': l.new_status, 'details': l.details, 'timestamp': l.timestamp.isoformat()
        } for l in logs],
        'page': page,
        'page_size': page_size,
        'total': total,
        'total_pages': (total + page_size - 1) // page_size,
    }
