from __future__ import annotations
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pathlib import Path
import json, shutil, uuid
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import ServiceOrder, OrderItem, Attachment, Vehicle, Notification, User
from ..services.parser import parse_service_order
from ..services.audit import add_audit
from ..services.notifications import manager
from ..services.measurement_report import build_measurement_pdf

router = APIRouter(prefix='/orders', tags=['Orders'])
UPLOAD_DIR = Path(__file__).resolve().parent.parent / 'static' / 'uploads'
REPORT_DIR = Path(__file__).resolve().parent.parent / 'static' / 'reports'
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)


def _serialize_order(order: ServiceOrder):
    return {
        'id': order.id,
        'order_number': order.order_number,
        'issuer_name': order.issuer_name,
        'issuer_cnpj': order.issuer_cnpj,
        'contractor_name': order.contractor_name,
        'vehicle_id': order.vehicle_id,
        'vehicle_plate': order.vehicle_plate,
        'vehicle_description': order.vehicle_description,
        'supplier_user_id': order.supplier_user_id,
        'supplier_name': order.supplier.name if order.supplier else None,
        'status': order.status,
        'open_date': order.open_date,
        'close_date': order.close_date,
        'observations': order.observations,
        'rejection_reason': order.rejection_reason,
        'rework_reason': order.rework_reason,
        'service_total': order.service_total,
        'product_total': order.product_total,
        'discount': order.discount,
        'charges': order.charges,
        'total_value': order.total_value,
        'confidence': order.confidence,
        'requires_review': order.requires_review,
        'measurement_status': order.measurement_status,
        'estimated_completion': order.estimated_completion,
        'original_file_path': order.original_file_path,
        'items': [{
            'id': item.id, 'item_code': item.item_code, 'description': item.description, 'item_type': item.item_type,
            'quantity': item.quantity, 'unit': item.unit, 'unit_price': item.unit_price, 'total_price': item.total_price,
            'confidence': item.confidence, 'need_evidence_count': item.need_evidence_count, 'done_evidence_count': item.done_evidence_count,
            'manually_edited': item.manually_edited
        } for item in order.items],
        'attachments': [{
            'id': a.id, 'category': a.category, 'item_id': a.item_id, 'file_name': a.file_name, 'file_path': a.file_path,
            'media_type': a.media_type, 'uploaded_by': a.uploaded_by
        } for a in order.attachments],
        'audit_logs': [{
            'id': l.id, 'action': l.action, 'previous_status': l.previous_status, 'new_status': l.new_status,
            'details': l.details, 'user_name': l.user_name, 'timestamp': l.timestamp.isoformat()
        } for l in order.audit_logs],
        'created_at': order.created_at.isoformat() if order.created_at else None,
        'updated_at': order.updated_at.isoformat() if order.updated_at else None,
        'parsed_payload': json.loads(order.parsed_payload or '{}'),
    }

async def _notify_order_users(db: Session, order: ServiceOrder, title: str, message: str, category: str='info'):
    recipients = db.query(User).filter(or_(User.role.in_(['gestor', 'fiscal', 'admin']), User.id == order.supplier_user_id)).all()
    for recipient in recipients:
        notif = Notification(user_id=recipient.id, title=title, message=message, category=category, order_id=order.id)
        db.add(notif)
        db.commit()
        db.refresh(notif)
        await manager.send_personal_message(recipient.id, {
            'id': notif.id, 'title': title, 'message': message, 'category': category, 'order_id': order.id, 'sound': True
        })

@router.get('')
def list_orders(status: str | None = None, plate: str | None = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(ServiceOrder)
    if user.role == 'fornecedor':
        q = q.filter(ServiceOrder.supplier_user_id == user.id)
    if status:
        q = q.filter(ServiceOrder.status == status)
    if plate:
        q = q.filter(ServiceOrder.vehicle_plate.ilike(f'%{plate}%'))
    return [_serialize_order(order) for order in q.order_by(ServiceOrder.created_at.desc()).all()]

@router.get('/dashboard')
def dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(ServiceOrder)
    if user.role == 'fornecedor':
        q = q.filter(ServiceOrder.supplier_user_id == user.id)
    orders = q.all()
    statuses = ['aguardando_aprovacao','aprovada','reprovada','em_andamento','aguardando_validacao','concluida','retrabalho','medicao']
    metrics = {s: sum(1 for o in orders if o.status == s) for s in statuses}
    return {
        **metrics,
        'total_ordens': len(orders),
        'total_valor': round(sum(o.total_value or 0 for o in orders), 2),
        'aptas_medicao': sum(1 for o in orders if o.measurement_status == 'apta'),
    }

@router.get('/{order_id}')
def get_order(order_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    order = db.get(ServiceOrder, order_id)
    if not order:
        raise HTTPException(404, 'Ordem não encontrada')
    if user.role == 'fornecedor' and order.supplier_user_id != user.id:
        raise HTTPException(403, 'Sem permissão')
    return _serialize_order(order)

@router.post('/upload-parse')
async def upload_and_parse(
    vehicle_id: int | None = Form(default=None),
    observations: str | None = Form(default=''),
    document: UploadFile = File(...),
    user=Depends(require_roles('fornecedor','gestor','admin','fiscal')),
    db: Session = Depends(get_db)
):
    ext = Path(document.filename).suffix.lower()
    if ext not in {'.pdf','.png','.jpg','.jpeg','.webp'}:
        raise HTTPException(400, 'Formato não suportado')
    file_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / file_name
    with file_path.open('wb') as buffer:
        shutil.copyfileobj(document.file, buffer)
    parsed = parse_service_order(str(file_path))
    vehicle = db.get(Vehicle, vehicle_id) if vehicle_id else None
    if not vehicle and parsed.get('vehicle_plate'):
        vehicle = db.query(Vehicle).filter(Vehicle.plate == parsed['vehicle_plate']).first()
    order = ServiceOrder(
        order_number=parsed.get('order_number'), issuer_name=parsed.get('issuer_name'), issuer_cnpj=parsed.get('issuer_cnpj'), contractor_name=parsed.get('contractor_name'),
        vehicle_id=vehicle.id if vehicle else None, vehicle_plate=parsed.get('vehicle_plate'), vehicle_description=parsed.get('vehicle_description'), supplier_user_id=user.id,
        status='aguardando_conferencia', open_date=parsed.get('open_date'), close_date=parsed.get('close_date'), observations=observations or parsed.get('observations') or '',
        service_total=parsed.get('service_total',0), product_total=parsed.get('product_total',0), discount=parsed.get('discount',0), charges=parsed.get('charges',0), total_value=parsed.get('total_value',0),
        confidence=parsed.get('confidence',0), original_file_path=f'/static/uploads/{file_name}', parsed_payload=json.dumps(parsed, ensure_ascii=False), requires_review=parsed.get('requires_review',False)
    )
    db.add(order); db.commit(); db.refresh(order)
    db.add(Attachment(order_id=order.id, category='document', item_id=None, file_name=document.filename, file_path=f'/static/uploads/{file_name}', media_type='document', uploaded_by=user.id))
    for item in parsed.get('items', []):
        db.add(OrderItem(order_id=order.id, **item))
    db.commit()
    add_audit(db, user=user, action='Upload e leitura automática da OS', order_id=order.id, new_status='aguardando_conferencia', details='Documento recebido e interpretado automaticamente.')
    await _notify_order_users(db, order, 'Nova ordem cadastrada', f'Ordem {order.order_number or order.id} enviada e aguardando conferência.', 'info')
    return _serialize_order(db.get(ServiceOrder, order.id))

@router.put('/{order_id}/confirm-parsed')
def confirm_parsed(order_id: int, payload: dict, db: Session = Depends(get_db), user=Depends(require_roles('fornecedor','gestor','admin'))):
    order = db.get(ServiceOrder, order_id)
    if not order:
        raise HTTPException(404, 'Ordem não encontrada')
    if user.role == 'fornecedor' and order.supplier_user_id != user.id:
        raise HTTPException(403, 'Sem permissão')
    missing_items = []
    for item in order.items if user.role == 'fornecedor' else []:
        count = db.query(Attachment).filter(Attachment.order_id == order.id, Attachment.category == 'before', Attachment.item_id == item.id).count()
        if count < item.need_evidence_count:
            missing_items.append(item.description)
    if user.role == 'fornecedor' and missing_items:
        raise HTTPException(400, f'Envie a foto de comprovaÃ§Ã£o para todos os itens antes de enviar para aprovaÃ§Ã£o: {", ".join(missing_items)}')
    prev_status = order.status
    order.order_number = payload.get('order_number', order.order_number)
    order.issuer_name = payload.get('issuer_name', order.issuer_name)
    order.issuer_cnpj = payload.get('issuer_cnpj', order.issuer_cnpj)
    order.contractor_name = payload.get('contractor_name', order.contractor_name)
    order.vehicle_plate = payload.get('vehicle_plate', order.vehicle_plate)
    order.vehicle_description = payload.get('vehicle_description', order.vehicle_description)
    order.open_date = payload.get('open_date', order.open_date)
    order.close_date = payload.get('close_date', order.close_date)
    order.observations = payload.get('observations', order.observations)
    order.service_total = float(payload.get('service_total', order.service_total) or 0)
    order.product_total = float(payload.get('product_total', order.product_total) or 0)
    order.discount = float(payload.get('discount', order.discount) or 0)
    order.charges = float(payload.get('charges', order.charges) or 0)
    order.total_value = float(payload.get('total_value', order.total_value) or 0)
    order.confidence = float(payload.get('confidence', order.confidence) or 0)
    order.requires_review = bool(payload.get('requires_review', order.requires_review))
    # replace items
    for item in list(order.items):
        db.delete(item)
    db.flush()
    for item in payload.get('items', []):
        db.add(OrderItem(order_id=order.id, manually_edited=True, **item))
    order.status = 'aguardando_aprovacao'
    order.parsed_payload = json.dumps(payload, ensure_ascii=False)
    db.commit(); db.refresh(order)
    add_audit(db, user=user, action='Conferência manual do OCR', order_id=order.id, previous_status=prev_status, new_status=order.status, details='Dados extraídos validados manualmente.')
    return _serialize_order(order)

@router.post('/{order_id}/attachments')
def upload_attachment(order_id: int, category: str = Form(...), item_id: int | None = Form(default=None), file: UploadFile = File(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    order = db.get(ServiceOrder, order_id)
    if not order:
        raise HTTPException(404, 'Ordem não encontrada')
    if user.role == 'fornecedor' and order.supplier_user_id != user.id:
        raise HTTPException(403, 'Sem permissão')

    allowed_categories = {'before', 'after', 'document', 'video', 'support'}
    if category not in allowed_categories:
        raise HTTPException(400, 'Categoria inválida. Use before, after, document, video ou support.')

    ext = Path(file.filename).suffix.lower()
    allowed_ext = {'.pdf', '.png', '.jpg', '.jpeg', '.webp', '.mp4', '.mov', '.avi', '.webm'}
    if ext not in allowed_ext:
        raise HTTPException(400, 'Tipo de arquivo não suportado')

    if category in {'before', 'after'}:
        if not item_id:
            raise HTTPException(400, 'item_id é obrigatório para evidências before/after')
        item = next((i for i in order.items if i.id == item_id), None)
        if not item:
            raise HTTPException(404, 'Item da ordem não encontrado para vincular a evidência')

    file_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / file_name
    with file_path.open('wb') as buffer:
        shutil.copyfileobj(file.file, buffer)

    media_type = 'video' if ext in {'.mp4', '.mov', '.avi', '.webm'} else 'image' if ext in {'.jpg', '.jpeg', '.png', '.webp'} else 'document'
    att = Attachment(order_id=order.id, category=category, item_id=item_id, file_name=file.filename, file_path=f'/static/uploads/{file_name}', media_type=media_type, uploaded_by=user.id)
    db.add(att); db.commit(); db.refresh(att)
    add_audit(db, user=user, action=f'Upload de evidência ({category})', order_id=order.id, new_status=order.status, details=f'Arquivo: {file.filename}')
    return {'id': att.id, 'file_path': att.file_path, 'category': att.category, 'item_id': att.item_id, 'media_type': att.media_type}

@router.post('/{order_id}/approve')
async def approve_order(order_id: int, payload: dict | None = None, db: Session = Depends(get_db), user=Depends(require_roles('gestor','fiscal','admin'))):
    order = db.get(ServiceOrder, order_id)
    if not order: raise HTTPException(404, 'Ordem não encontrada')
    prev = order.status
    order.status = 'aprovada'; order.rejection_reason = None
    db.commit(); db.refresh(order)
    add_audit(db, user=user, action='Aprovação da ordem', order_id=order.id, previous_status=prev, new_status=order.status)
    await _notify_order_users(db, order, 'Ordem aprovada', f'Ordem {order.order_number or order.id} aprovada para execução.', 'success')
    return _serialize_order(order)

@router.post('/{order_id}/reject')
async def reject_order(order_id: int, payload: dict, db: Session = Depends(get_db), user=Depends(require_roles('gestor','fiscal','admin'))):
    order = db.get(ServiceOrder, order_id)
    if not order: raise HTTPException(404, 'Ordem não encontrada')
    justification = (payload or {}).get('justification')
    if not justification:
        raise HTTPException(400, 'Justificativa obrigatória')
    prev = order.status
    order.status = 'reprovada'; order.rejection_reason = justification
    db.commit(); db.refresh(order)
    add_audit(db, user=user, action='Reprovação da ordem', order_id=order.id, previous_status=prev, new_status=order.status, details=justification)
    await _notify_order_users(db, order, 'Ordem reprovada', f'Ordem {order.order_number or order.id} reprovada. Motivo: {justification}', 'error')
    return _serialize_order(order)

@router.post('/{order_id}/start')
async def start_service(order_id: int, payload: dict | None = None, db: Session = Depends(get_db), user=Depends(require_roles('fornecedor'))):
    order = db.get(ServiceOrder, order_id)
    if not order or order.supplier_user_id != user.id: raise HTTPException(404, 'Ordem não encontrada')
    if order.status != 'aprovada': raise HTTPException(400, 'A ordem precisa estar aprovada')
    estimated_completion = (payload or {}).get('estimated_completion')
    if not estimated_completion:
        raise HTTPException(400, 'Informe a previsÃ£o de conclusÃ£o antes de iniciar o serviÃ§o')
    # require evidence per item before start
    for item in order.items:
        count = db.query(Attachment).filter(Attachment.order_id == order.id, Attachment.category == 'before', Attachment.item_id == item.id).count()
        if count < item.need_evidence_count:
            raise HTTPException(400, f'Evidência inicial obrigatória para o item {item.description}')
    prev = order.status
    order.estimated_completion = estimated_completion
    order.status = 'em_andamento'
    db.commit(); db.refresh(order)
    add_audit(db, user=user, action='Início do serviço', order_id=order.id, previous_status=prev, new_status=order.status)
    await _notify_order_users(db, order, 'Serviço iniciado', f'Ordem {order.order_number or order.id} iniciada pelo fornecedor.', 'info')
    return _serialize_order(order)

@router.post('/{order_id}/finish')
async def finish_service(order_id: int, payload: dict | None = None, db: Session = Depends(get_db), user=Depends(require_roles('fornecedor'))):
    order = db.get(ServiceOrder, order_id)
    if not order or order.supplier_user_id != user.id: raise HTTPException(404, 'Ordem não encontrada')
    if order.status not in {'em_andamento','retrabalho'}: raise HTTPException(400, 'A ordem precisa estar em andamento ou retrabalho')
    for item in order.items:
        count = db.query(Attachment).filter(Attachment.order_id == order.id, Attachment.category == 'after', Attachment.item_id == item.id).count()
        if count < item.done_evidence_count:
            raise HTTPException(400, f'Evidência final obrigatória para o item {item.description}')
    prev = order.status
    order.status = 'aguardando_validacao'
    db.commit(); db.refresh(order)
    add_audit(db, user=user, action='Conclusão do serviço', order_id=order.id, previous_status=prev, new_status=order.status, details=(payload or {}).get('justification',''))
    await _notify_order_users(db, order, 'Serviço concluído', f'Ordem {order.order_number or order.id} concluída e aguardando validação.', 'warning')
    return _serialize_order(order)

@router.post('/{order_id}/validate')
async def validate_service(order_id: int, db: Session = Depends(get_db), user=Depends(require_roles('gestor','fiscal','admin'))):
    order = db.get(ServiceOrder, order_id)
    if not order: raise HTTPException(404, 'Ordem não encontrada')
    if order.status != 'aguardando_validacao': raise HTTPException(400, 'Ordem não está aguardando validação')
    prev = order.status
    order.status = 'concluida'; order.measurement_status = 'apta'
    db.commit(); db.refresh(order)
    add_audit(db, user=user, action='Validação final', order_id=order.id, previous_status=prev, new_status=order.status)
    await _notify_order_users(db, order, 'Conclusão aprovada', f'Ordem {order.order_number or order.id} aprovada e liberada para medição.', 'success')
    return _serialize_order(order)

@router.post('/{order_id}/rework')
async def request_rework(order_id: int, payload: dict, db: Session = Depends(get_db), user=Depends(require_roles('gestor','fiscal','admin'))):
    order = db.get(ServiceOrder, order_id)
    if not order: raise HTTPException(404, 'Ordem não encontrada')
    justification = (payload or {}).get('justification')
    if not justification: raise HTTPException(400, 'Justificativa obrigatória')
    prev = order.status
    order.status = 'retrabalho'; order.rework_reason = justification
    db.commit(); db.refresh(order)
    add_audit(db, user=user, action='Solicitação de retrabalho', order_id=order.id, previous_status=prev, new_status=order.status, details=justification)
    await _notify_order_users(db, order, 'Retrabalho solicitado', f'Ordem {order.order_number or order.id} retornou para retrabalho: {justification}', 'error')
    return _serialize_order(order)

@router.post('/{order_id}/send-to-measurement')
def send_to_measurement(order_id: int, db: Session = Depends(get_db), user=Depends(require_roles('gestor','fiscal','admin'))):
    order = db.get(ServiceOrder, order_id)
    if not order: raise HTTPException(404, 'Ordem não encontrada')
    prev = order.status
    if order.status != 'concluida': raise HTTPException(400, 'Apenas ordens concluídas podem ir para medição')
    order.status = 'medicao'; order.measurement_status = 'enviada'
    db.commit(); db.refresh(order)
    add_audit(db, user=user, action='Envio para medição', order_id=order.id, previous_status=prev, new_status=order.status)
    return _serialize_order(order)

@router.get('/measurement/report')
def measurement_report(
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(require_roles('gestor','fiscal','admin'))
):
    query = db.query(ServiceOrder).filter(ServiceOrder.measurement_status.in_(['apta','enviada']), ServiceOrder.status.in_(['concluida','medicao']))
    if date_from:
        query = query.filter(ServiceOrder.created_at >= f'{date_from} 00:00:00')
    if date_to:
        query = query.filter(ServiceOrder.created_at <= f'{date_to} 23:59:59')
    orders = query.all()
    rows = [{
        'order_id': o.id,
        'order_number': o.order_number or str(o.id),
        'vehicle_plate': o.vehicle_plate or '-',
        'supplier_name': o.supplier.name if o.supplier else '-',
        'status': o.status,
        'total_value': o.total_value or 0,
        'estimated_completion': o.estimated_completion,
        'attachments': [{
            'id': attachment.id,
            'category': attachment.category,
            'file_name': attachment.file_name,
            'file_path': attachment.file_path,
            'media_type': attachment.media_type,
        } for attachment in o.attachments if attachment.category in {'before', 'after'}],
        'evidence_files': [
            str((UPLOAD_DIR.parent.parent / attachment.file_path.lstrip('/')).resolve())
            for attachment in o.attachments
            if attachment.category in {'before', 'after'} and attachment.media_type == 'image'
        ],
        'evidence_names': [
            attachment.file_name
            for attachment in o.attachments
            if attachment.category in {'before', 'after'}
        ],
    } for o in orders]
    out = REPORT_DIR / 'boletim_medicao.pdf'
    build_measurement_pdf(str(out), 'Boletim de Medição - Serviços Mecânicos', rows, round(sum(r['total_value'] for r in rows), 2))
    return {
        'url': '/static/reports/boletim_medicao.pdf',
        'total_ordens': len(rows),
        'total_valor': round(sum(r['total_value'] for r in rows), 2),
        'rows': rows,
        'date_from': date_from,
        'date_to': date_to,
    }
