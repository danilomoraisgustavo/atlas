from app.database import Base, SessionLocal, engine
from app.models import User, Vehicle
from app.security import hash_password


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    users = [
        {
            'name': 'Danilo Gustavo',
            'email': 'danilo.m.gustavo@gmail.com',
            'password': 'DeD-140619',
            'role': 'gestor',
            'active': True,
            'permissions': 'all',
        },
        {
            'name': 'Financeiro Tropical Canaã',
            'email': 'financeiro@tropicalcanaa.com.br',
            'password': 'fornecedor@123',
            'role': 'fornecedor',
            'active': True,
            'permissions': 'supplier_portal,upload_orders,send_evidence',
        },
    ]

    vehicles = [
        {
            'plate': 'BRA2E19',
            'prefix': 'CAM-001',
            'model': '24.280',
            'brand': 'Volkswagen',
            'type': 'Caminhão',
            'department': 'Operação',
            'status': 'ativo',
            'observations': 'Veículo de exemplo para cadastro inicial.',
        },
        {
            'plate': 'FTR9A21',
            'prefix': 'CAM-002',
            'model': 'Cargo 2429',
            'brand': 'Ford',
            'type': 'Caminhão',
            'department': 'Manutenção',
            'status': 'ativo',
            'observations': 'Veículo de exemplo para testes do fluxo de OS.',
        },
    ]

    for item in users:
        existing = db.query(User).filter(User.email == item['email']).first()
        if existing:
            existing.name = item['name']
            existing.password_hash = hash_password(item['password'])
            existing.role = item['role']
            existing.active = item['active']
            existing.permissions = item['permissions']
        else:
            db.add(User(
                name=item['name'],
                email=item['email'],
                password_hash=hash_password(item['password']),
                role=item['role'],
                active=item['active'],
                permissions=item['permissions'],
            ))

    for item in vehicles:
        existing = db.query(Vehicle).filter(Vehicle.plate == item['plate']).first()
        if existing:
            for key, value in item.items():
                setattr(existing, key, value)
        else:
            db.add(Vehicle(**item))

    db.commit()
    db.close()
    print('Seed concluído com sucesso.')


if __name__ == '__main__':
    seed()
