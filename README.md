# Atlas Frota

## Backend
```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
python seed.py
python -m uvicorn app.main:app --reload
```

## Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Credenciais iniciais
- Gestor: danilo.m.gustavo@gmail.com / DeD-140619
- Fornecedor: financeiro@tropicalcanaa.com.br / fornecedor@123

## Produção

Os arquivos de deploy para AWS EC2 + GitHub Actions estão em:

- `DEPLOYMENT.md`
- `docker-compose.prod.yml`
- `deploy/bootstrap-ec2.sh`
- `deploy/deploy.sh`
- `.github/workflows/pipeline.yml`
