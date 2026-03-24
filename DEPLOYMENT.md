# Deploy na AWS EC2 com GitHub Actions

## Arquitetura

- `backend`: FastAPI em container Docker
- `web`: Nginx em container servindo o frontend compilado e fazendo proxy para `/api` e `/static`
- `docker-compose.prod.yml`: sobe toda a aplicação
- `deploy/bootstrap-ec2.sh`: prepara a EC2 e clona o repositório
- `deploy/deploy.sh`: faz pull da branch e reaplica o stack
- `.github/workflows/pipeline.yml`: CI/CD com build, testes e deploy automático

## 1. Criar a EC2

Sugestão inicial:

- Ubuntu 24.04 LTS
- Tipo `t3.small` ou superior
- Security Group:
  - `22` liberado apenas para seu IP
  - `80` liberado para internet
  - `443` liberado para internet se for ativar HTTPS depois

## 2. Configurar chave SSH da EC2

Conecte via SSH na máquina e gere uma chave de deploy para o GitHub:

```bash
ssh-keygen -t ed25519 -C "atlas-frota-ec2" -f ~/.ssh/atlas_frota_deploy
cat ~/.ssh/atlas_frota_deploy.pub
```

Adicione essa chave pública no seu repositório GitHub como:

- `Settings` > `Deploy keys`
- habilite leitura para permitir `git pull` na EC2

## 3. Clonar o projeto na EC2

Na EC2:

```bash
export REPO_SSH_URL=git@github.com:SEU_USUARIO/SEU_REPOSITORIO.git
export APP_DIR=/opt/atlas-frota
export BRANCH=main
bash deploy/bootstrap-ec2.sh
```

## 4. Ajustar ambiente de produção

Crie o arquivo de produção:

```bash
cp .env.production.example .env.production
nano .env.production
```

Valores mínimos:

```env
APP_PORT=80
VITE_API_URL=/api
DATABASE_URL=sqlite:////app/data/service_orders.db
BACKEND_CORS_ORIGINS=https://seu-dominio.com.br,http://IP_DA_EC2
```

## 5. Subir manualmente a primeira vez

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

## 6. Configurar secrets no GitHub Actions

No GitHub, configure estes secrets no repositório ou no environment `production`:

- `EC2_HOST`
- `EC2_PORT`
- `EC2_USER`
- `EC2_APP_DIR`
- `EC2_SSH_PRIVATE_KEY`
- `EC2_KNOWN_HOSTS` opcional

## 7. Fluxo de deploy automático

- push em `main` ou `master`
- roda testes/build
- conecta na EC2 via SSH
- executa `deploy/deploy.sh`

## 8. Persistência

Os dados ficam persistidos em volumes Docker:

- banco SQLite
- uploads de evidências
- relatórios gerados

## 9. HTTPS

Para produção pública, recomendo apontar um domínio e ativar HTTPS antes de uso externo.

## 10. Observações

- SQLite atende bem uma única EC2, mas para crescer recomendo PostgreSQL
- não suba `.env.production` para o repositório
