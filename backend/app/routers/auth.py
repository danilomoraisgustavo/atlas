from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..security import create_access_token, verify_password
from ..schemas.auth import LoginRequest
from ..deps import get_current_user

router = APIRouter(prefix='/auth', tags=['Auth'])


@router.post('/login')
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Credenciais inválidas')
    if not user.active:
        raise HTTPException(status_code=403, detail='Usuário inativo')
    token = create_access_token({'sub': str(user.id), 'role': user.role, 'email': user.email})
    return {
        'access_token': token,
        'token_type': 'bearer',
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'active': user.active,
            'permissions': user.permissions.split(',') if user.permissions else [],
        },
    }


@router.get('/me')
def me(user=Depends(get_current_user)):
    return {
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'active': user.active,
        'permissions': user.permissions.split(',') if user.permissions else [],
    }
