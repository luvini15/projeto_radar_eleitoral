# Radar Eleitoral

> **Arquivo legado:** esta aplicação mantém login simulado. Não publique este diretório. O frontend ativo está na raiz do repositório e sua configuração de segurança está em `../SECURITY.md`.

Plataforma privada de inteligência de Instagram para campanhas políticas.

O Radar Eleitoral coleta dados públicos de perfis monitorados, armazena os dados no PostgreSQL e disponibiliza análises comparativas em um dashboard web.

O projeto foi estruturado para funcionar com múltiplos clientes. Cada campanha possui um perfil principal e pode possuir diversos concorrentes associados.

---

## Arquitetura

```text
Instagram público
        |
        v
      Apify
        |
        v
 FastAPI - Backend
        |
        v
 PostgreSQL - Docker
        |
        v
 API de Analytics
        |
        v
 React + Vite - Frontend
```

Estrutura principal:

```text
radar-eleitoral-meta-api/
├── backend/
│   ├── app/
│   │   ├── integrations/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── database.py
│   │   ├── main.py
│   │   └── models.py
│   ├── .env
│   ├── .env.example
│   └── requirements.txt
│
├── radar-eleitoral/
│   ├── src/
│   ├── .env.local
│   ├── .env.example
│   └── package.json
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

# Tecnologias utilizadas

## Backend

- Python
- FastAPI
- SQLModel
- SQLAlchemy
- Psycopg
- Apify Client

## Banco de dados

- PostgreSQL 16
- Docker

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts

---

# Pré-requisitos

Antes de rodar o projeto, instalar:

- Docker Desktop
- Python 3.11 ou superior
- Node.js 18 ou superior
- Git

Os comandos deste README foram escritos considerando PowerShell no Windows.

---

# PostgreSQL

O banco de dados do Radar roda em um container Docker.

Configuração atual:

| Configuração | Valor |
|---|---|
| Container | `radar_postgres` |
| Imagem | `postgres:16` |
| Banco | `radar_eleitoral` |
| Usuário | `radar` |
| Senha local | `radar123` |
| Porta interna do container | `5432` |
| Porta no computador | `5433` |

## Importante sobre a porta

O PostgreSQL roda dentro do container na porta padrão `5432`.

No Windows, porém, ele é exposto pela porta `5433`.

```text
Windows / Backend               Docker

localhost:5433  ------------->  PostgreSQL:5432
```

Por isso, o backend deve utilizar:

```text
localhost:5433
```

A URL de conexão atual é:

```text
postgresql+psycopg://radar:radar123@localhost:5433/radar_eleitoral
```

---

# Subindo o PostgreSQL

Na raiz do projeto:

```powershell
docker compose up -d
```

Depois confira:

```powershell
docker ps
```

O esperado é algo semelhante a:

```text
radar_postgres
postgres:16
0.0.0.0:5433->5432/tcp
```

Para visualizar os logs:

```powershell
docker logs radar_postgres
```

Para parar o container sem apagar os dados:

```powershell
docker compose down
```

## Atenção

Não executar:

```powershell
docker compose down -v
```

O parâmetro `-v` remove o volume do PostgreSQL e pode apagar os dados persistidos.

---

# Acessando o PostgreSQL

## Pelo terminal

Execute:

```powershell
docker exec -it radar_postgres psql -U radar -d radar_eleitoral
```

Se funcionar, aparecerá:

```text
radar_eleitoral=#
```

Para sair:

```sql
\q
```

## Configuração para DBeaver, DataGrip ou pgAdmin

```text
Host: localhost
Port: 5433
Database: radar_eleitoral
Username: radar
Password: radar123
```

---

# Comandos úteis do PostgreSQL

Listar tabelas:

```sql
\dt
```

Ver campanhas:

```sql
SELECT *
FROM campaigns;
```

Ver perfis cadastrados:

```sql
SELECT
    id,
    username,
    full_name,
    profile_type
FROM instagram_profiles
ORDER BY id;
```

Ver os perfis de cada campanha:

```sql
SELECT
    c.name AS campaign,
    p.username,
    cp.role,
    cp.active
FROM campaign_profiles cp
JOIN campaigns c
    ON c.id = cp.campaign_id
JOIN instagram_profiles p
    ON p.id = cp.profile_id
ORDER BY
    c.id,
    cp.role,
    p.username;
```

Quantidade de posts salvos por perfil:

```sql
SELECT
    p.username,
    COUNT(ip.id) AS posts_salvos
FROM instagram_profiles p
LEFT JOIN instagram_posts ip
    ON ip.profile_id = p.id
GROUP BY
    p.id,
    p.username
ORDER BY
    p.username;
```

Histórico de seguidores:

```sql
SELECT
    p.username,
    ps.followers_count,
    ps.following_count,
    ps.posts_count,
    ps.collected_at
FROM profile_snapshots ps
JOIN instagram_profiles p
    ON p.id = ps.profile_id
ORDER BY
    ps.collected_at DESC;
```

Snapshots dos posts:

```sql
SELECT
    post_id,
    likes_count,
    comments_count,
    views_count,
    plays_count,
    interactions_count,
    interactions_complete,
    collected_at
FROM post_snapshots
ORDER BY
    collected_at DESC
LIMIT 50;
```

---

# Backend

Entre na pasta:

```powershell
cd backend
```

Crie um ambiente virtual:

```powershell
python -m venv .venv
```

Ative:

```powershell
.\.venv\Scripts\Activate.ps1
```

Instale as dependências:

```powershell
pip install -r requirements.txt
```

---

# Configuração do backend

Crie:

```text
backend/.env
```

Pode copiar o arquivo de exemplo:

```powershell
Copy-Item .env.example .env
```

Conteúdo:

```env
DATABASE_URL=postgresql+psycopg://radar:radar123@localhost:5433/radar_eleitoral
APIFY_TOKEN=SEU_TOKEN_DA_APIFY
```

O token da Apify não deve ser enviado para o GitHub.

---

# Rodando o backend

Dentro de `backend`:

```powershell
uvicorn app.main:app --reload
```

O backend ficará disponível em:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

Health check:

```text
http://127.0.0.1:8000/health
```

---

# Frontend

Abra outro terminal.

Entre na pasta:

```powershell
cd radar-eleitoral
```

Instale as dependências:

```powershell
npm install
```

---

# Configuração do frontend

Crie:

```text
radar-eleitoral/.env.local
```

Ou copie:

```powershell
Copy-Item .env.example .env.local
```

Conteúdo:

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_CAMPAIGN_ID=1
```

`VITE_CAMPAIGN_ID=1` corresponde atualmente à campanha do Claudio Borcem.

Posteriormente esse valor deverá ser definido automaticamente de acordo com o usuário autenticado.

---

# Rodando o frontend

```powershell
npm run dev
```

Normalmente o frontend ficará disponível em:

```text
http://localhost:5173
```

---

# Ordem correta para iniciar o projeto

## Terminal 1 — Banco

Na raiz:

```powershell
docker compose up -d
```

## Terminal 2 — Backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

## Terminal 3 — Frontend

```powershell
cd radar-eleitoral
npm run dev
```

A ordem recomendada é:

```text
Docker Desktop
      ↓
PostgreSQL
      ↓
FastAPI
      ↓
React
```

---

# Estrutura multi-cliente

O Radar não foi desenvolvido somente para um político.

A estrutura utiliza:

```text
Campaign
    |
    v
CampaignProfile
    |
    v
InstagramProfile
```

Isso permite, por exemplo:

```text
Campanha A
├── Político A
├── Concorrente X
├── Concorrente Y
└── Concorrente Z
```

e:

```text
Campanha B
├── Político B
├── Concorrente C
├── Concorrente D
└── Concorrente E
```

Um mesmo perfil do Instagram pode fazer parte de mais de uma campanha sem que seus dados sejam duplicados.

---

# Campanha atual

Atualmente a campanha `id = 1` corresponde a:

```text
Claudio Borcem
```

Perfis associados:

```text
@claudioborcem_
Role: CLIENT

@deputadopepa
Role: COMPETITOR

@deputadoroberio
Role: COMPETITOR

@telmarufinooficial
Role: COMPETITOR
```

---

# Principais tabelas

## campaigns

Clientes/campanhas cadastrados no Radar.

## instagram_profiles

Perfis únicos monitorados no Instagram.

## campaign_profiles

Relaciona perfis a campanhas.

Roles possíveis:

```text
CLIENT
COMPETITOR
LOCAL_PAGE
MEDIA
```

## instagram_posts

Armazena os posts coletados.

Um post é identificado principalmente pelo shortcode do Instagram.

Posts já existentes não são duplicados.

## post_snapshots

Armazena o estado das métricas de cada post em diferentes momentos.

Exemplo:

```text
Post A
26/08 → 100 comentários
27/08 → 120 comentários
28/08 → 150 comentários
```

Isso permite criar histórico de desempenho.

## profile_snapshots

Armazena snapshots de perfil, principalmente:

```text
followers_count
following_count
posts_count
collected_at
```

Isso permite construir o histórico de seguidores.

---

# Integração com Apify

O Radar utiliza a Apify para coletar dados públicos do Instagram.

São coletados dados como:

- perfil;
- seguidores públicos;
- posts;
- legenda;
- data de publicação;
- tipo do conteúdo;
- localização quando disponível;
- likes públicos;
- comentários;
- views quando disponíveis;
- plays quando disponíveis.

---

# Atualização dos dados

O botão:

```text
Atualizar dados
```

dispara:

```text
POST /api/campaigns/{campaign_id}/sync
```

O fluxo é:

```text
Usuário clica em Atualizar dados
        ↓
FastAPI
        ↓
Apify
        ↓
Coleta perfis e posts
        ↓
PostgreSQL
        ↓
Criação de snapshots
        ↓
Frontend recarrega os analytics
```

Atualmente são analisados até:

```text
25 posts recentes por perfil
```

---

# Endpoints

## Campanhas

```text
GET  /api/campaigns
POST /api/campaigns
GET  /api/campaigns/{campaign_id}
POST /api/campaigns/{campaign_id}/profiles
```

## Sincronização

```text
POST /api/sync/instagram/{username}
POST /api/campaigns/{campaign_id}/sync
```

## Analytics

```text
GET /api/campaigns/{campaign_id}/overview
GET /api/campaigns/{campaign_id}/benchmark
GET /api/campaigns/{campaign_id}/posts
GET /api/campaigns/{campaign_id}/rankings
GET /api/campaigns/{campaign_id}/followers-history
GET /api/campaigns/{campaign_id}/themes-formats
GET /api/campaigns/{campaign_id}/time-performance
GET /api/campaigns/{campaign_id}/competitors
```

---

# Seguidores

O Radar coleta o total público de seguidores através da Apify.

Cada atualização cria um snapshot.

Exemplo:

```text
26/08 → 42.300
27/08 → 42.450
28/08 → 42.610
```

O histórico não é retroativo.

O gráfico é construído progressivamente conforme novas coletas são realizadas.

---

# Likes ocultos

Alguns perfis ocultam o total de curtidas.

Nesses casos, a Apify pode retornar:

```text
-1
```

O backend normaliza isso para:

```text
NULL
```

O frontend deve apresentar:

```text
N/D
```

Nunca apresentar `0`, porque isso significaria que o post realmente não recebeu curtidas.

---

# Interações observadas

A KPI completa conceitualmente seria:

```text
likes
+ comentários
+ compartilhamentos
+ salvos
```

Porém os dados públicos coletados não fornecem sempre shares e saves.

Por isso o Radar utiliza:

```text
Interações observadas
```

Essa métrica representa apenas os componentes efetivamente disponíveis.

Ela não deve ser interpretada como engajamento oficial da Meta.

---

# Views e Plays

Quando disponíveis, `Views` representam visualizações retornadas pela fonte.

`Plays` representam reproduções do conteúdo em vídeo.

Plays podem ser maiores que views porque podem incluir múltiplas reproduções.

No frontend é recomendado utilizar os termos:

```text
Visualizações de Reels
Reproduções de Reels
```

---

# Métricas ainda dependentes da Meta API

Sem a Meta API não é possível obter de forma confiável:

- alcance oficial;
- saves completos;
- shares completos;
- demografia dos seguidores;
- idade;
- gênero;
- localização detalhada dos seguidores;
- contas alcançadas;
- contas engajadas;
- visitas ao perfil;
- cliques;
- métricas privadas da conta.

Esses dados não devem ser inventados ou estimados.

Quando não estiverem disponíveis, o sistema deve mostrar:

```text
N/D
```

ou informar:

```text
Disponível após conexão com a Meta API
```

---

# Temas e Formatos

Formatos são derivados dos tipos retornados pelo Instagram.

Normalização atual:

```text
Video / clips
→ Reels

Image / feed
→ Imagem

Sidecar
→ Carrossel
```

Os temas são classificados pelo próprio Radar utilizando as legendas.

Essas categorias não são fornecidas oficialmente pelo Instagram.

---

# Concorrentes

A aba Concorrentes compara o perfil principal com os perfis configurados como `COMPETITOR`.

São comparados dados reais como:

- seguidores;
- posts analisados;
- comentários por post;
- likes por post;
- views por Reel;
- plays por Reel;
- interações observadas.

---

# Desempenho por dia e horário

O Radar utiliza `published_at` dos posts coletados e cruza com suas métricas.

Isso permite analisar desempenho por:

```text
dia da semana
+
faixa de horário
```

As análises são associações históricas.

Não significam relação causal.

---

# Segurança

Nunca subir para o GitHub:

```text
backend/.env
radar-eleitoral/.env.local
.env
.venv
node_modules
```

Os seguintes arquivos podem ser versionados:

```text
.env.example
backend/.env.example
radar-eleitoral/.env.example
```

Antes de qualquer commit:

```powershell
git status
```

Para verificar arquivos `.env` rastreados:

```powershell
git ls-files | Select-String -Pattern "\.env"
```

Não deve aparecer:

```text
backend/.env
radar-eleitoral/.env.local
```

---

# Build

## Frontend

```powershell
cd radar-eleitoral
npm install
npm run build
```

## Backend

```powershell
cd backend
python -c "from app.main import app; print(app.title)"
```

---

# Troubleshooting

## Docker não encontra docker-compose.yml

Verifique se está na raiz do projeto:

```powershell
dir
```

Deve aparecer:

```text
docker-compose.yml
backend
radar-eleitoral
```

Depois:

```powershell
docker compose up -d
```

## Backend não conecta ao PostgreSQL

Verifique:

```powershell
docker ps
```

Deve aparecer:

```text
5433->5432
```

Confira `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://radar:radar123@localhost:5433/radar_eleitoral
```

Teste:

```powershell
docker exec radar_postgres psql -U radar -d radar_eleitoral -c "SELECT 1;"
```

## ModuleNotFoundError: app

Normalmente significa que o Uvicorn foi executado fora da pasta `backend`.

Faça:

```powershell
cd backend
uvicorn app.main:app --reload
```

## Porta 5432 ocupada

O ambiente de desenvolvimento já possui outro PostgreSQL local utilizando `5432`.

Por isso o Radar utiliza:

```text
localhost:5433
```

O PostgreSQL dentro do container continua usando `5432`.

## Frontend não conecta ao backend

Confirme:

```text
FastAPI
http://127.0.0.1:8000

React
http://localhost:5173
```

Confira `radar-eleitoral/.env.local`:

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_CAMPAIGN_ID=1
```

---

# Próximas etapas

Principais evoluções previstas:

- integração oficial com Meta API;
- autenticação;
- autorização por campanha;
- painel administrativo;
- coleta automática diária;
- Google Trends;
- tendências do Instagram;
- aprimoramento da classificação temática;
- análise de tamanho de amostra nos horários;
- inteligência estratégica automatizada;
- melhorias na comparação entre cliente e concorrentes;
- publicação segura em produção.
