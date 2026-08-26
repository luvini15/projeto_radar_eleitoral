# Radar Eleitoral — Atualizações

## Principais alterações

- Backend em FastAPI integrado ao PostgreSQL.
- PostgreSQL executado via Docker.
- Banco exposto localmente na porta 5433.
- Integração com Apify para coleta de posts e seguidores.
- Armazenamento de snapshots de posts e perfis.
- Estrutura multi-cliente com campanhas e concorrentes.
- Dashboard utilizando dados reais.
- Nova aba de Concorrentes.
- Comparação entre cliente e concorrentes.
- Rankings de conteúdos.
- Histórico de seguidores.
- Temas e formatos calculados a partir dos dados coletados.
- Desempenho por dia e horário calculado a partir dos posts.
- Métricas indisponíveis são apresentadas como N/D.
- Likes ocultos são armazenados como NULL.
- Shares e saves não são estimados quando indisponíveis.

## PostgreSQL

Host:

localhost

Porta:

5433

Banco:

radar_eleitoral

Usuário:

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

## Segurança

Não versionar:

- backend/.env
- radar-eleitoral/.env.local
- .env
- .venv
- node_modules

Os arquivos .env.example podem ser versionados normalmente.
