# Radar Eleitoral

> **Acesso:** configure Supabase Auth, MFA opcional, cadastro automático, migrações e HTTPS antes de usar. Consulte [SECURITY.md](SECURITY.md).

# Contexto do Projeto

O Radar Eleitoral é uma plataforma de inteligência digital desenvolvida para auxiliar no acompanhamento, organização e análise de dados públicos relacionados à comunicação política nas redes sociais.

O projeto surgiu a partir da necessidade de transformar informações dispersas das redes sociais em dados estruturados e indicadores estratégicos, permitindo acompanhar o desempenho de conteúdos, identificar temas relevantes, analisar a presença digital de diferentes perfis e compreender demandas regionais do Distrito Federal.

O parceiro do projeto é **Cláudio Borcem**, candidato a Deputado Distrital pelo Distrito Federal, para quem a plataforma foi desenvolvida inicialmente como uma ferramenta de monitoramento e análise estratégica da comunicação digital.

A solução permite acompanhar métricas de publicações, evolução de seguidores, desempenho de conteúdos, atuação de concorrentes, tendências territoriais e temas identificados a partir das publicações analisadas.

Por meio da integração entre coleta automatizada de dados, processamento, armazenamento histórico e visualizações analíticas, o Radar Eleitoral busca transformar dados de redes sociais em informações organizadas para apoiar análises e decisões estratégicas baseadas em dados.

## Arquitetura operacional — dados reais

O frontend integrado Data Sight está na raiz (`src/`) e reúne monitoramento, coletas, seguidores, filtros, concorrentes, inteligência territorial, relatórios, comentários e análise de posts com IA. A pasta `radar-eleitoral/` preserva o frontend anterior. O fluxo operacional é `Apify → FastAPI → PostgreSQL → API agregada → React`.

- Backend: FastAPI/SQLModel, porta `8000`.
- Frontend integrado: React/Vite, porta `5173`.
- PostgreSQL 16: Docker, host `localhost`, porta `5433`, banco `radar_eleitoral`.
- Supabase Auth e autorizacao no backend; consulte SECURITY.md.

### Executar

```bash
docker compose up -d postgres
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\alembic upgrade head
.venv\Scripts\uvicorn app.main:app --reload
```

Em outro terminal:

```bash
# Na raiz do repositório
npm install
npm run dev
```

Frontend: `http://localhost:5173`. API: `http://127.0.0.1:8000`. Swagger: `http://127.0.0.1:8000/docs`. PostgreSQL: `localhost:5433`.

### Ambiente e segurança

Copie `backend/.env.example` para `backend/.env` e defina `DATABASE_URL` e `APIFY_TOKEN`. A senha PostgreSQL deve existir apenas no `.env` local. Copie `.env.example` para `.env.local` e configure `VITE_API_URL`. A campanha é escolhida pelo seletor do Data Sight. O token Apify nunca vai para o frontend. Se um token tiver sido versionado anteriormente, revogue-o e gere outro.

### Inteligência territorial

Depois das migracoes Alembic, a inicializacao popula as 35 RAs e os temas existentes. A tabela `profile_regions` identifica a RA do perfil; `post_regions` aceita várias RAs por publicação e guarda fonte, confiança e evidência literal. Portais `DF_GENERAL` nunca recebem fallback territorial do perfil. Menções no conteúdo prevalecem sobre a associação do perfil. Casos ambíguos ficam sem RA; localidades conhecidas usam um dicionário com fontes em `backend/app/config/territorial_aliases.json`.

A migração aditiva é `backend/migrations/003_post_territories.sql`. Importação XLSX/CSV e processamento local não iniciam Apify ou scheduler. No PowerShell, a partir da raiz:

```powershell
$env:PYTHONPATH='backend'
backend/.venv/Scripts/python.exe -m app.territorial_cli migrate --output reports/territorial/migration.json
backend/.venv/Scripts/python.exe -m app.territorial_cli import --campaign-id 1 --spreadsheet "CAMINHO_DA_PLANILHA.xlsx" --general --output reports/territorial/profile-import.json
backend/.venv/Scripts/python.exe -m app.territorial_cli classify --output reports/territorial/classification.json
```

A conexão deve estar em `DATABASE_URL` no ambiente ou `.env` carregado pelo backend. O campo legado `profile_type` é preservado; metadados editoriais usam `profile_monitoring`. A importação normaliza usernames, não duplica registros e relata divergências sem apagar associações preexistentes. Linhas marcadas inválidas/inativas são cadastradas com vínculo inativo.

Associe perfil territorial com `PUT /api/profiles/{profile_id}/region`. `POST /api/campaigns/{campaign_id}/classify-posts` processa apenas a campanha. `GET /api/campaigns/{campaign_id}/trends/posts` permite abrir todos os posts que sustentam uma tendência, com os mesmos filtros e paginação. O detalhe da publicação mostra separadamente a RA do perfil e as RAs da publicação. A taxonomia temática existente é reutilizada e revisões manuais são preservadas.

O score de tendência usa 30% participação no volume, 25% crescimento limitado, 25% participação nas interações e 20% recorrência. Crescimento é `(atual - anterior) / anterior`; período anterior igual a zero retorna “sem base”. Conclusões carregam links reais de evidência.

### Auditoria das decisões territoriais

`GET /api/territorial/audit` lista as decisões persistidas, com legenda, evidência, RA, tema e métricas do último snapshot. `GET /api/territorial/audit/summary` consolida posts únicos, atribuições e fontes. Ambos aceitam filtros por RA, confiança, perfil, tema, datas, ausência de RA e múltiplas RAs; a consulta não reclassifica posts. Veja [o relatório da auditoria e cadastro Planaltina](reports/territorial-audit/README.md) e [o relatório visual local](reports/territorial-audit/audit.html).

### Monitoramento contínuo

Cada execução cria um registro em `collection_runs` e um detalhe por perfil em `profile_collection_runs`. A janela recente é coletada com limite configurável; `shortcode` impede duplicação de posts, enquanto novos `post_snapshots` e `profile_snapshots` preservam a evolução das métricas e seguidores. Uma falha isolada não cancela os demais perfis e produz status `PARTIAL` ou `FAILED` com erro resumido, sem incluir credenciais.

Coleta manual via API:

```bash
curl -X POST "http://127.0.0.1:8000/api/campaigns/1/collections?limit=25"
```

Coleta automática pelo Docker (não exige iniciar `app.scheduler` manualmente):

```bash
docker compose up -d --build
```

Configure `backend/.env` com as credenciais locais. No `.env` da raiz, defina `POSTGRES_PASSWORD` e `DATABASE_URL_DOCKER` com a conexão PostgreSQL para o host `postgres:5432` e banco `radar_eleitoral`; use a mesma senha do volume existente. Não publique esses arquivos. A API ocupa a porta 8000: encerre uma API nativa anterior antes de iniciar o Compose. O frontend continua com `npm run dev`.

Configuração padrão, disponível nos `.env.example`:

```dotenv
COLLECTION_ENABLED=true
COLLECTION_DAILY_TIME=03:00
COLLECTION_TIMEZONE=America/Sao_Paulo
COLLECTION_POST_LIMIT=25
```

Backend e scheduler usam a mesma implementação de `auto_sync.py`. No Docker, a API usa `COLLECTION_SCHEDULER_MODE=external` e o serviço `scheduler` executa o worker. No ambiente nativo de produção, `APP_ENV=production` e o modo `embedded` iniciam esse mesmo worker no lifespan da API. O padrão `APP_ENV=development` impede a criação do worker e a execução real de `tick`, mesmo se um `.env` antigo habilitar a coleta. No Docker operacional, os serviços declaram `APP_ENV=production`. PostgreSQL advisory locks elegem um único líder e bloqueiam coletas simultâneas da mesma campanha, inclusive entre chamadas manuais e automáticas. O lock sobrevive aos commits e é liberado na desconexão.

O próximo horário fica em `sync_schedules`, em UTC, após cálculo em `America/Sao_Paulo`. Um reinício mais de cinco minutos depois da janela diária agenda o dia seguinte sem coleta retroativa. O avanço é persistido antes de chamar o provedor, evitando repetir a tentativa após reinício. O legado `AUTO_SYNC_CAMPAIGN_IDS` continua funcionando como override por intervalo no mesmo worker. Deixe vazio para usar o horário diário em todas as campanhas ativas com perfis ativos.

A página **Coletas** informa atividade com base no heartbeat real, token e configuração, além de horário, timezone, última/próxima execução, status e erros por coleta. **Executar agora** mantém o fallback manual e consome créditos. Em testes, configure `COLLECTION_ENABLED=false`, `COLLECTION_SCHEDULER_MODE=disabled` e tokens vazios.

O endpoint analítico `GET /api/campaigns/{id}/analytics` aplica no backend período, RA, múltiplos perfis, tema e formato. Ele alimenta séries diárias, desempenho por tema/formato, comparação de perfis e comparação territorial. A agregação usa as RAs detectadas por publicação; perfil geral sem RA fixa pode contribuir quando há evidência textual ou de localização. O filtro `territorial_origin` distingue `CONTENT`, `LOCATION` e `PROFILE`.

A página **Concorrentes** reutiliza esse endpoint em uma única chamada por alteração de filtro. Métricas de escalas incompatíveis são exibidas em gráficos separados. O ranking permite alternar a métrica sem combinar eixos; o gráfico tema × desempenho usa publicações no eixo X e interação média no eixo Y; e a matriz tema × perfil responde quem está falando sobre cada assunto.

### Relatórios, migração e testes

`POST /api/campaigns/{campaign_id}/reports` persiste o pacote e o HTML executivo. Para PDF, abra o HTML retornado e use **Imprimir → Salvar como PDF**; estilos A4 e links são preservados.

```bash
set PYTHONPATH=backend
python -m unittest discover -s backend/tests -v
npm run build
npm run lint
```

A entrega e seus resultados reais estão em [reports/territorial/IMPLEMENTATION.md](reports/territorial/IMPLEMENTATION.md).

Troubleshooting: confirme `docker compose ps` e porta `5433` em erros de banco; confirme a campanha selecionada quando a API vier vazia; associe perfis explicitamente para filtrar por RA; confira token/saldo/actors quando a sincronização Apify falhar.

## Detalhamento de posts, IA e OpenCode

A tabela de Conteúdos mostra uma prévia de cada publicação. O link **Ver detalhes**
abre uma página própria com mídia, métricas atuais, textos de comentários disponíveis
e histórico de coletas. A linha evolutiva pode ser filtrada por 7, 30, 90 ou 365 dias
e por comentário, curtida, visualização, reprodução, interação, compartilhamento ou
salvamento. Os pontos são snapshots acumulados observados em cada coleta.

O painel de IA usa o roteador gratuito do OpenRouter e guarda a resposta no banco
enquanto os dados do post não mudarem. Por padrão, no máximo 20 análises novas são
enviadas por dia; resultados em cache não consomem esse limite. A evidência enviada
contém métricas, legenda e no máximo 30 textos da amostra de comentários, sem token
da Apify ou autores. A análise é descritiva e não representa intenção de voto,
opinião de todo o público ou análise completa dos comentários.

Crie uma chave na sua conta OpenRouter e configure somente em `backend/.env`:

```env
OPENROUTER_API_KEY=sua_chave
OPENROUTER_MODEL=openrouter/free
AI_DAILY_LIMIT=20
```

Reinicie o backend depois de salvar. O Swagger expõe a operação em
`POST /api/campaigns/{campaign_id}/posts/{post_id}/analysis`.

O arquivo `opencode.json` configura o mesmo modelo gratuito e o servidor MCP local
`radar`. Com o backend rodando, inicie o OpenCode sem expor a chave no terminal:

```powershell
backend/.venv/Scripts/python.exe backend/start_opencode.py
```

O MCP fornece seis ferramentas somente de leitura para campanhas, perfis, resumo,
posts, detalhe com comentários/histórico e seguidores. Confira a conexão com
`opencode mcp list`. O teste do protocolo é `backend/tests/check_mcp.py`, usando a
fixture na porta 8001. As perguntas de avaliação ficam em
`backend/tests/mcp_evaluations.xml`.

## Referência histórica do protótipo

As seções abaixo documentam o protótipo original; o fluxo integrado atual está descrito acima.

Dashboard privado de inteligência digital para acompanhamento do Instagram da campanha de **Cláudio Borcem**, candidato a Deputado Distrital do Distrito Federal.

> **CONFIDENCIAL — Uso exclusivo da campanha de Cláudio Borcem.**
> Todos os dados neste protótipo são **fictícios e ilustrativos**.

---

## Como rodar o projeto

Pré-requisitos: [Node.js](https://nodejs.org) 18 ou superior.

```bash
# 1. Instalar as dependências
npm install

# 2. Rodar em modo desenvolvimento
npm run dev
```

O terminal mostrará um endereço local (algo como `http://localhost:5173`). Abra no navegador.

Em outro terminal, mantenha a API ativa:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Confirme em `http://localhost:8000/health` que a resposta é `{"status":"ok"}`. O login do Supabase só abre o painel depois que essa API valida o usuário.

O login exige credenciais Supabase e autorização na API. Quando o usuário ativa MFA, os próximos acessos também exigem o código do autenticador. Veja [SECURITY.md](SECURITY.md) para configurar o ambiente antes de iniciar.

Para gerar a versão de produção (arquivos estáticos, prontos para hospedar):

```bash
npm run build
```

Os arquivos finais aparecem em `dist/`.

---

## Tecnologias utilizadas

- **React 19** + **TypeScript**
- **Tailwind CSS v4**
- Componentes no estilo **shadcn/ui** (Card, Button, Badge, Input, Select, Sheet, Dialog)
- **Recharts** (gráficos de área, linha, barra e dispersão)
- **Lucide Icons**
- **React Router** (rotas e proteção de páginas)
- **Supabase JS** (autenticação por senha e TOTP)

---

## Estrutura do projeto

```
src/
  components/
    layout/       Sidebar, Topbar, banner de confidencialidade, rodapé, layout geral
    dashboard/     Cards de métricas, resumo executivo, alertas
    charts/        Gráficos (seguidores, alcance, engajamento, dispersão, heatmap)
    tables/        Tabela de conteúdos e painel lateral de detalhe
    insights/      Cards de tema, comparação de formatos, insights estratégicos
    ui/            Componentes de base (Card, Button, Badge, Input, Select, Sheet, Dialog, Toast)
  pages/           Login, Overview, Content, Topics, Schedule, Audience, Insights, Settings
  data/            Dados fictícios fixos (mockAccount, mockDailyMetrics, mockMedia, mockInsights)
  services/        InstagramDataProvider (interface), MockInstagramService, MetaInstagramService (stub), Supabase client
  types/           Tipos TypeScript do domínio
  utils/           Funções de formatação e cálculo (metrics.ts)
  lib/             Contexto de autenticação, utilitário de classes CSS
```

---

## Preparado para dados reais

Toda a aplicação consome dados através da interface `InstagramDataProvider`
(`src/services/instagramService.ts`). Hoje ela é implementada por
`MockInstagramService`, que retorna os dados fictícios de `src/data/`.

Quando a integração oficial com a API do Instagram (Meta Graph API) estiver
autorizada, basta completar `src/services/metaInstagramService.ts` e trocar
a instância exportada em `instagramService.ts`:

```ts
// De:
export const instagramService: InstagramDataProvider = new MockInstagramService()

// Para:
export const instagramService: InstagramDataProvider = new MetaInstagramService()
```

Nenhum componente visual precisa ser alterado.

---

## Autenticação

O login usa Supabase Auth com senha, Google e TOTP opcional. A API valida a sessão,
exige `aal2` de quem ativou MFA e cadastra automaticamente novos usuários como analistas. Configure o ambiente conforme
[SECURITY.md](SECURITY.md).

---

## Segurança e confidencialidade

- Meta tag `robots: noindex, nofollow, noarchive` no `index.html`;
- Nenhuma chave de API fica no código-fonte (uso de variáveis de ambiente);
- Nenhum dado real de terceiros é utilizado — todos os valores em `src/data/`
  são fictícios e fixos;
- Avisos de confidencialidade fixos no topo e no rodapé de todas as páginas.

---

## Responsividade

O layout foi construído para funcionar em desktop, notebook, tablet e
celular: a barra lateral vira um menu recolhível, os cards se reorganizam em
colunas únicas, e as tabelas ganham rolagem horizontal em telas estreitas.


---

## Versão alinhada ao que a API oficial da Meta pode entregar

Esta versão foi ajustada para evitar promessas que não dependem diretamente da API oficial. O dashboard mantém apenas módulos que podem ser alimentados por dados oficiais da conta autorizada ou por análises internas do Radar:

- **Visão Geral:** seguidores, alcance, visualizações, interações, engajamento e conteúdos publicados.
- **Conteúdos:** mídia, legenda, formato, data, link/miniatura e métricas por publicação quando disponíveis.
- **Temas e Formatos:** os formatos vêm da Meta; os temas são classificados pelo Radar a partir da legenda e podem ser revisados.
- **Desempenho por Horário:** análise histórica cruzando horário da publicação e métricas do conteúdo.
- **Audiência:** dados agregados, quando disponibilizados e elegíveis por volume mínimo.
- **Inteligência Estratégica:** recomendações geradas pelo Radar com base nas métricas oficiais.

O projeto não promete, nesta versão:

- ranking de concorrentes;
- métricas privadas de outros candidatos;
- lista de seguidores ou unfollows individuais;
- previsão de voto;
- sentimento nativo da Meta;
- mapa detalhado por Região Administrativa.

A tela de configurações já contém o estado futuro “Conectar Instagram”, com aviso de que a autorização será feita por OAuth da Meta, sem solicitar senha do candidato.

### Comparação e métricas diárias

A página Concorrentes usa exclusivamente vínculos ativos `CampaignProfile.role=COMPETITOR`. O endpoint existente `GET /api/campaigns/{id}/analytics` ganhou os filtros opcionais `role` e `profile_selection=selected`; uma seleção explicitamente vazia retorna um recorte vazio. Sem esses parâmetros, os demais consumidores mantêm seu escopo anterior.

Desempenho por dia soma o último snapshot de cada publicação, por data de publicação em UTC, e oferece interações, curtidas, comentários, visualizações, reproduções, compartilhamentos, salvamentos e publicações. Não mede incrementos de interações recebidas no dia. Datas sem publicações e métricas indisponíveis não são preenchidas; `metric_samples` informa a cobertura de cada métrica. O total considera todos os selecionados, com comparação visual dos cinco primeiros perfis. Audiência usa exclusivamente snapshots de seguidores, com uma série por perfil e lacunas preservadas.

Os testes de navegador usam `backend/tests/serve_ui_fixture.py`, que cria SQLite temporário e desliga os provedores e o scheduler. Os testes PostgreSQL exigem `TEST_DATABASE_URL` apontando para uma instância descartável; não leem mais a conexão operacional de `backend/.env`. O script MCP aceita `UI_FIXTURE_PORT` para apontar para a mesma API isolada.

## Integra??o do redesign e territorial

O schema ? gerenciado pelo Alembic; API e scheduler n?o executam create_all. Em instala??o existente sem hist?rico Alembic, fa?a backup e confira o schema antes de marcar `0001_baseline`, conforme SECURITY.md; depois execute `alembic upgrade head`. A revis?o 0005 adiciona as tabelas territoriais de forma idempotente.

No Compose, configure `DATABASE_URL_DOCKER` para o usu?rio de runtime e `MIGRATION_DATABASE_URL_DOCKER` para o owner; veja `.env.compose.example`. O servi?o migrate deve concluir antes da API e do scheduler. Provisione o usu?rio de runtime conforme SECURITY.md. O frontend ? executado com `npm run dev` ou hospedado separadamente.

A navega??o territorial usa `/inteligencia-territorial`; `/insights` permanece compat?vel. Autentica??o Supabase, Assistant, landing page e componentes do redesign s?o preservados.
