# Radar Eleitoral � Atualiza��es

## Principais altera��es

- Backend em FastAPI integrado ao PostgreSQL.
- PostgreSQL executado via Docker.
- Banco exposto localmente na porta 5433.
- Integra��o com Apify para coleta de posts e seguidores.
- Armazenamento de snapshots de posts e perfis.
- Estrutura multi-cliente com campanhas e concorrentes.
- Dashboard utilizando dados reais.
- Nova aba de Concorrentes.
- Compara��o entre cliente e concorrentes.
- Rankings de conte�dos.
- Hist�rico de seguidores.
- Temas e formatos calculados a partir dos dados coletados.
- Desempenho por dia e hor�rio calculado a partir dos posts.
- M�tricas indispon�veis s�o apresentadas como N/D.
- Likes ocultos s�o armazenados como NULL.
- Shares e saves n�o s�o estimados quando indispon�veis.

## PostgreSQL

Host:

localhost

Porta:

5433

Banco:

radar_eleitoral

Usu�rio:

radar

Senha local:

radar123

Acesso pelo terminal:

docker exec -it radar_postgres psql -U radar -d radar_eleitoral

## Backend

Executar dentro de backend:

uvicorn app.main:app --reload

Backend:

http://127.0.0.1:8000

Swagger:

http://127.0.0.1:8000/docs

## Frontend

Executar dentro de radar-eleitoral:

npm install
npm run dev

Frontend:

http://localhost:5173

## Seguran�a

N�o versionar:

- backend/.env
- radar-eleitoral/.env.local
- .env
- .venv
- node_modules

Os arquivos .env.example podem ser versionados normalmente.


o PowerShell, a partir da raiz do projeto:
# 1. Inicie o PostgreSQL
$env:POSTGRES_PASSWORD = "radar123"
docker compose up -d postgres

# 2. Aplique as migrações
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head

# 3. Inicie a API
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.