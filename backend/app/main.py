from pathlib import Path
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from .database import Base, engine
from .routers import admin, auth, maintenance, notifications, orders, vehicles

Base.metadata.create_all(bind=engine)


def _ensure_order_columns():
    inspector = inspect(engine)

    # Verifica se a tabela existe
    if 'service_orders' not in inspector.get_table_names():
        return

    # Lista colunas existentes
    columns = [col['name'] for col in inspector.get_columns('service_orders')]

    # Adiciona coluna se não existir
    if 'estimated_completion' not in columns:
        with engine.begin() as connection:
            connection.execute(text("""
                ALTER TABLE service_orders 
                ADD COLUMN estimated_completion VARCHAR(40)
            """))

_ensure_order_columns()
app = FastAPI(title='Atlas Frota API', version='1.0.0')
cors_origins = [origin.strip() for origin in os.getenv('BACKEND_CORS_ORIGINS', '*').split(',') if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
static_dir = Path(__file__).resolve().parent / 'static'
app.mount('/static', StaticFiles(directory=str(static_dir)), name='static')

app.include_router(auth.router)
app.include_router(vehicles.router)
app.include_router(orders.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(maintenance.router)


@app.get('/')
def health():
    return {'status': 'ok', 'app': 'Atlas Frota API'}


@app.get('/health')
def healthcheck():
    return {'status': 'healthy'}
