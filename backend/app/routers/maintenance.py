from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import MaintenanceRecord, Vehicle

router = APIRouter(prefix='/maintenance', tags=['Maintenance'])

TASK_DEFINITIONS = [
    {'code': 'lubrificacao_semanal', 'label': 'Lubrificação semanal', 'frequency_days': 7},
    {'code': 'preventiva_semanal', 'label': 'Preventiva semanal', 'frequency_days': 7},
    {'code': 'limpeza_ar_quinzenal', 'label': 'Limpeza do ar-condicionado', 'frequency_days': 14},
]


def _parse_month(month: str | None) -> date:
    if not month:
        today = date.today()
        return date(today.year, today.month, 1)
    year, month_value = month.split('-')
    return date(int(year), int(month_value), 1)


def _month_range(anchor: date) -> tuple[date, date]:
    start = anchor - timedelta(days=anchor.weekday())
    next_month = date(anchor.year + (anchor.month // 12), (anchor.month % 12) + 1, 1)
    end_of_month = next_month - timedelta(days=1)
    end = end_of_month + timedelta(days=(6 - end_of_month.weekday()))
    return start, end


def _iter_schedule(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


@router.get('/calendar')
def maintenance_calendar(month: str | None = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    anchor = _parse_month(month)
    start, end = _month_range(anchor)
    vehicles = db.query(Vehicle).order_by(Vehicle.plate).all()
    existing = db.query(MaintenanceRecord).filter(
        MaintenanceRecord.scheduled_date >= start.isoformat(),
        MaintenanceRecord.scheduled_date <= end.isoformat(),
    ).all()
    records_map = {(record.vehicle_id, record.task_type, record.scheduled_date): record for record in existing}

    weeks: dict[str, list[dict]] = {}
    for scheduled in _iter_schedule(start, end):
        week_key = scheduled - timedelta(days=scheduled.weekday())
        week_label = week_key.strftime('%d/%m/%Y')
        if week_label not in weeks:
            weeks[week_label] = []

        for vehicle in vehicles:
            for task in TASK_DEFINITIONS:
                if task['frequency_days'] == 14 and scheduled.weekday() != 0:
                    continue
                if task['frequency_days'] == 14:
                    week_index = ((scheduled - start).days // 7)
                    if week_index % 2 == 1:
                        continue
                elif scheduled.weekday() != 0:
                    continue

                record = records_map.get((vehicle.id, task['code'], scheduled.isoformat()))
                weeks[week_label].append({
                    'vehicle_id': vehicle.id,
                    'vehicle_plate': vehicle.plate,
                    'vehicle_model': vehicle.model,
                    'task_type': task['code'],
                    'task_label': task['label'],
                    'scheduled_date': scheduled.isoformat(),
                    'completed': bool(record.completed) if record else False,
                    'completed_at': record.completed_at.isoformat() if record and record.completed_at else None,
                    'notes': record.notes if record else '',
                    'record_id': record.id if record else None,
                    'completed_by': record.completed_by if record else None,
                })

    history = db.query(MaintenanceRecord).filter(MaintenanceRecord.completed == True).order_by(MaintenanceRecord.completed_at.desc()).limit(60).all()
    return {
        'month': anchor.strftime('%Y-%m'),
        'weeks': [{'week_start': week, 'items': items} for week, items in weeks.items()],
        'history': [{
            'id': record.id,
            'vehicle_plate': record.vehicle.plate if record.vehicle else '-',
            'task_type': record.task_type,
            'scheduled_date': record.scheduled_date,
            'completed_at': record.completed_at.isoformat() if record.completed_at else None,
            'notes': record.notes,
        } for record in history],
    }


@router.post('/records')
def upsert_maintenance_record(payload: dict, db: Session = Depends(get_db), user=Depends(require_roles('fornecedor'))):
    vehicle_id = payload.get('vehicle_id')
    task_type = payload.get('task_type')
    scheduled_date = payload.get('scheduled_date')
    completed = bool(payload.get('completed'))
    notes = (payload.get('notes') or '').strip()

    if not vehicle_id or not task_type or not scheduled_date:
        raise HTTPException(400, 'vehicle_id, task_type e scheduled_date são obrigatórios')

    record = db.query(MaintenanceRecord).filter(
        MaintenanceRecord.vehicle_id == vehicle_id,
        MaintenanceRecord.task_type == task_type,
        MaintenanceRecord.scheduled_date == scheduled_date,
    ).first()

    if not record:
        record = MaintenanceRecord(vehicle_id=vehicle_id, task_type=task_type, scheduled_date=scheduled_date)
        db.add(record)

    record.completed = completed
    record.notes = notes
    record.completed_by = user.id if completed else None
    record.completed_at = datetime.utcnow() if completed else None
    db.commit()
    db.refresh(record)

    return {
        'id': record.id,
        'vehicle_id': record.vehicle_id,
        'task_type': record.task_type,
        'scheduled_date': record.scheduled_date,
        'completed': record.completed,
        'completed_at': record.completed_at.isoformat() if record.completed_at else None,
        'notes': record.notes,
    }
