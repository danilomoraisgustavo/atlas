from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class TimestampMixin:
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class User(Base, TimestampMixin):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False)
    active = Column(Boolean, default=True)
    permissions = Column(Text, default='')

class Vehicle(Base, TimestampMixin):
    __tablename__ = 'vehicles'
    id = Column(Integer, primary_key=True)
    plate = Column(String(20), unique=True, nullable=False, index=True)
    prefix = Column(String(50), nullable=True)
    model = Column(String(120), nullable=True)
    brand = Column(String(120), nullable=True)
    type = Column(String(120), nullable=True)
    department = Column(String(120), nullable=True)
    status = Column(String(30), default='ativo')
    observations = Column(Text, default='')

class ServiceOrder(Base, TimestampMixin):
    __tablename__ = 'service_orders'
    id = Column(Integer, primary_key=True)
    order_number = Column(String(50), nullable=True, index=True)
    issuer_name = Column(String(255), nullable=True)
    issuer_cnpj = Column(String(30), nullable=True)
    contractor_name = Column(String(255), nullable=True)
    vehicle_id = Column(Integer, ForeignKey('vehicles.id'), nullable=True)
    vehicle_plate = Column(String(20), nullable=True)
    vehicle_description = Column(String(120), nullable=True)
    supplier_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    status = Column(String(40), default='rascunho')
    open_date = Column(String(20), nullable=True)
    close_date = Column(String(20), nullable=True)
    observations = Column(Text, default='')
    rejection_reason = Column(Text, nullable=True)
    rework_reason = Column(Text, nullable=True)
    service_total = Column(Float, default=0)
    product_total = Column(Float, default=0)
    discount = Column(Float, default=0)
    charges = Column(Float, default=0)
    total_value = Column(Float, default=0)
    confidence = Column(Float, default=0)
    original_file_path = Column(String(255), nullable=True)
    parsed_payload = Column(Text, default='{}')
    requires_review = Column(Boolean, default=False)
    measurement_status = Column(String(30), default='pendente')
    estimated_completion = Column(String(40), nullable=True)

    supplier = relationship('User')
    vehicle = relationship('Vehicle')
    items = relationship('OrderItem', back_populates='order', cascade='all, delete-orphan')
    attachments = relationship('Attachment', back_populates='order', cascade='all, delete-orphan')
    audit_logs = relationship('AuditLog', back_populates='order', cascade='all, delete-orphan')

class OrderItem(Base, TimestampMixin):
    __tablename__ = 'order_items'
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('service_orders.id'), nullable=False)
    item_code = Column(String(50), nullable=True)
    description = Column(Text, nullable=False)
    item_type = Column(String(20), nullable=False)
    quantity = Column(Float, default=1)
    unit = Column(String(20), default='UN')
    unit_price = Column(Float, default=0)
    total_price = Column(Float, default=0)
    confidence = Column(Float, default=0)
    need_evidence_count = Column(Integer, default=1)
    done_evidence_count = Column(Integer, default=1)
    manually_edited = Column(Boolean, default=False)
    service_execution_description = Column(Text, nullable=True)
    approval_status = Column(String(20), default='pendente')
    approval_reason = Column(Text, nullable=True)

    order = relationship('ServiceOrder', back_populates='items')

class Attachment(Base, TimestampMixin):
    __tablename__ = 'attachments'
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('service_orders.id'), nullable=False)
    category = Column(String(30), nullable=False)  # document, before, after
    item_id = Column(Integer, ForeignKey('order_items.id'), nullable=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(255), nullable=False)
    media_type = Column(String(20), nullable=False)
    uploaded_by = Column(Integer, ForeignKey('users.id'), nullable=False)

    order = relationship('ServiceOrder', back_populates='attachments')

class Notification(Base, TimestampMixin):
    __tablename__ = 'notifications'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(20), default='info')
    read = Column(Boolean, default=False)
    order_id = Column(Integer, ForeignKey('service_orders.id'), nullable=True)

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('service_orders.id'), nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    user_name = Column(String(120), nullable=False)
    action = Column(String(120), nullable=False)
    previous_status = Column(String(40), nullable=True)
    new_status = Column(String(40), nullable=True)
    details = Column(Text, default='')
    timestamp = Column(DateTime, default=datetime.utcnow)

    order = relationship('ServiceOrder', back_populates='audit_logs')


class MaintenanceRecord(Base, TimestampMixin):
    __tablename__ = 'maintenance_records'
    id = Column(Integer, primary_key=True)
    vehicle_id = Column(Integer, ForeignKey('vehicles.id'), nullable=False)
    task_type = Column(String(50), nullable=False)
    scheduled_date = Column(String(20), nullable=False, index=True)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    completed_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    notes = Column(Text, default='')

    vehicle = relationship('Vehicle')
