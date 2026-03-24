# Backend - Atlas Frota

## Como executar

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload
```

A API ficará em `http://127.0.0.1:8000`.

## Credenciais iniciais

- Gestor: `danilo.m.gustavo@gmail.com` / `DeD-140619`
- Fornecedor: `financeiro@tropicalcanaa.com.br` / `fornecedor@123`

## Fluxos prontos

- Login JWT
- Cadastro/leitura automática de ordem via upload de PDF/imagem
- Conferência manual do parsing
- Aprovação/reprovação com justificativa
- Evidência obrigatória por item antes e depois
- Início/conclusão/validação/retrabalho
- Notificação interna + WebSocket
- Módulo de medição com geração de boletim em PDF
- Auditoria e trilha de ações
- SQLite com seed inicial
