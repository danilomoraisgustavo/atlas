from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import Vehicle

router = APIRouter(prefix='/vehicles', tags=['Vehicles'])

@router.get('')
def list_vehicles(db: Session = Depends(get_db), user=Depends(get_current_user)):
    items = db.query(Vehicle).order_by(Vehicle.plate).all()
    return [{
        'id': v.id, 'plate': v.plate, 'prefix': v.prefix, 'model': v.model, 'brand': v.brand,
        'type': v.type, 'department': v.department, 'status': v.status, 'observations': v.observations
    } for v in items]


@router.post('')
def create_vehicle(payload: dict, db: Session = Depends(get_db), user=Depends(require_roles('gestor', 'admin', 'fiscal'))):
    if not payload.get('plate'):
        raise HTTPException(400, 'plate é obrigatório')

    normalized_plate = payload['plate'].strip().upper()
    duplicate = db.query(Vehicle).filter(Vehicle.plate == normalized_plate).first()
    if duplicate:
        raise HTTPException(400, 'Já existe um veículo com esta placa')

    vehicle = Vehicle(
        plate=normalized_plate,
        prefix=payload.get('prefix'),
        model=payload.get('model'),
        brand=payload.get('brand'),
        type=payload.get('type'),
        department=payload.get('department'),
        status=payload.get('status') or 'ativo',
        observations=payload.get('observations'),
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    return {
        'id': vehicle.id, 'plate': vehicle.plate, 'prefix': vehicle.prefix, 'model': vehicle.model, 'brand': vehicle.brand,
        'type': vehicle.type, 'department': vehicle.department, 'status': vehicle.status, 'observations': vehicle.observations
    }


@router.put('/{vehicle_id}')
def update_vehicle(vehicle_id: int, payload: dict, db: Session = Depends(get_db), user=Depends(require_roles('gestor', 'admin', 'fiscal'))):
    vehicle = db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(404, 'Veículo não encontrado')

    required_fields = ['plate']
    for field in required_fields:
        if not payload.get(field):
            raise HTTPException(400, f'{field} é obrigatório')

    duplicate = db.query(Vehicle).filter(Vehicle.plate == payload['plate'], Vehicle.id != vehicle_id).first()
    if duplicate:
        raise HTTPException(400, 'Já existe outro veículo com esta placa')

    vehicle.plate = payload.get('plate', vehicle.plate)
    vehicle.prefix = payload.get('prefix', vehicle.prefix)
    vehicle.model = payload.get('model', vehicle.model)
    vehicle.brand = payload.get('brand', vehicle.brand)
    vehicle.type = payload.get('type', vehicle.type)
    vehicle.department = payload.get('department', vehicle.department)
    vehicle.status = payload.get('status', vehicle.status)
    vehicle.observations = payload.get('observations', vehicle.observations)
    db.commit()
    db.refresh(vehicle)

    return {
        'id': vehicle.id, 'plate': vehicle.plate, 'prefix': vehicle.prefix, 'model': vehicle.model, 'brand': vehicle.brand,
        'type': vehicle.type, 'department': vehicle.department, 'status': vehicle.status, 'observations': vehicle.observations
    }


@router.delete('/{vehicle_id}')
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db), user=Depends(require_roles('gestor', 'admin', 'fiscal'))):
    vehicle = db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(404, 'Veículo não encontrado')

    db.delete(vehicle)
    db.commit()
    return {'success': True}
