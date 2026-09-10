# Radar Eleitoral

## Arquitetura operacional — dados reais

O frontend integrado está em `radar-eleitoral/`; o frontend da raiz foi preservado como protótipo histórico e ainda usa mocks. O fluxo operacional é `Apify → FastAPI → PostgreSQL → API agregada → React`.

- Backend: FastAPI/SQLModel, porta `8000`.
- Frontend integrado: React/Vite, porta `5173`.
- PostgreSQL 16: Docker, host `localhost`, porta `5433`, banco `radar_eleitoral`.
- Autenticação: simulada; Supabase está preparado, mas ainda não é autenticação de produção.

### Executar

```bash
docker compose up -d postgres
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\uvicorn app.main:app --reload
```

Em outro terminal:

```bash
cd radar-eleitoral
npm install
npm run dev
```

Frontend: `http://localhost:5173`. API: `http://127.0.0.1:8000`. Swagger: `http://127.0.0.1:8000/docs`. PostgreSQL: `localhost:5433`.

### Ambiente e segurança

Copie `backend/.env.example` para `backend/.env` e defina `DATABASE_URL` e `APIFY_TOKEN`. A senha PostgreSQL deve existir apenas no `.env` local. Copie `radar-eleitoral/.env.example` para `radar-eleitoral/.env.local` e configure `VITE_API_URL` e `VITE_CAMPAIGN_ID`. O token Apify nunca vai para o frontend. Se um token tiver sido versionado anteriormente, revogue-o e gere outro.

### Inteligência territorial

A inicialização cria aditivamente as 35 RAs e os temas iniciais, sem inventar população. Associe perfil e RA com `PUT /api/profiles/{profile_id}/region`. Classifique posts com `POST /api/campaigns/{campaign_id}/classify-posts`; a operação é idempotente.

O score de tendência usa 30% participação no volume, 25% crescimento limitado, 25% participação nas interações e 20% recorrência. Crescimento é `(atual - anterior) / anterior`; período anterior igual a zero retorna “sem base”. Conclusões carregam links reais de evidência.

### Monitoramento contínuo

Cada execução cria um registro em `collection_runs` e um detalhe por perfil em `profile_collection_runs`. A janela recente é coletada com limite configurável; `shortcode` impede duplicação de posts, enquanto novos `post_snapshots` e `profile_snapshots` preservam a evolução das métricas e seguidores. Uma falha isolada não cancela os demais perfis e produz status `PARTIAL` ou `FAILED` com erro resumido, sem incluir credenciais.

Coleta manual via API:

```bash
curl -X POST "http://127.0.0.1:8000/api/campaigns/1/collections?limit=25"
```

Coleta automática em processo separado:

```bash
cd backend
.venv\Scripts\python -m app.scheduler
```

Configure no `backend/.env`:

```dotenv
COLLECTION_DAILY_TIME=03:00
COLLECTION_TIMEZONE=America/Sao_Paulo
COLLECTION_POST_LIMIT=25
```

O scheduler deve permanecer como processo independente da API. Em produção, execute o comando por serviço do sistema, container ou gerenciador de processos com reinício automático. Não execute múltiplas instâncias do scheduler para o mesmo banco. A tela **Coletas** mostra próxima execução, sucesso, coleta parcial, falhas, novos posts e snapshots.

O endpoint analítico `GET /api/campaigns/{id}/analytics` aplica no backend período, RA, múltiplos perfis, tema e formato. Ele alimenta séries diárias, desempenho por tema/formato, comparação de perfis e comparação territorial. Perfis sem associação explícita não entram em agregações por RA.

A página **Concorrentes** reutiliza esse endpoint em uma única chamada por alteração de filtro. Métricas de escalas incompatíveis são exibidas em gráficos separados. O ranking permite alternar a métrica sem combinar eixos; o gráfico tema × desempenho usa publicações no eixo X e interação média no eixo Y; e a matriz tema × perfil responde quem está falando sobre cada assunto.

### Relatórios, migração e testes

`POST /api/campaigns/{campaign_id}/reports` persiste o pacote e o HTML executivo. Para PDF, abra o HTML retornado e use **Imprimir → Salvar como PDF**; estilos A4 e links são preservados.

```bash
docker exec -i radar_postgres psql -U radar -d radar_eleitoral < backend/migrations/001_territorial_intelligence.sql
docker exec -i radar_postgres psql -U radar -d radar_eleitoral < backend/migrations/002_continuous_monitoring.sql
set PYTHONPATH=backend
python -m unittest discover -s backend/tests -v
cd radar-eleitoral && npm run build
```

Troubleshooting: confirme `docker compose ps` e porta `5433` em erros de banco; confirme `VITE_CAMPAIGN_ID` quando a API vier vazia; associe perfis explicitamente para filtrar por RA; confira token/saldo/actors quando a sincronização Apify falhar.

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

Na tela de login, qualquer combinação de e-mail e senha preenchidos libera o acesso (autenticação simulada — veja seção "Autenticação" abaixo).

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
- **Supabase JS** (preparado para autenticação futura, não ativo no protótipo)

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
  lib/             Contexto de autenticação simulada, utilitário de classes CSS
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

O login atual é **simulado**: qualquer e-mail e senha preenchidos liberam o
acesso, e a sessão fica apenas em `sessionStorage` do navegador (nada de
senha ou token real é armazenado).

O projeto já inclui `@supabase/supabase-js` e um cliente preparado em
`src/services/supabaseClient.ts`. Para ativar a autenticação real com
Supabase Auth no futuro:

1. Copie `.env.example` para `.env.local`;
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com as chaves do
   seu projeto Supabase (nunca comite esse arquivo);
3. Substitua a lógica de `signIn` em `src/lib/authContext.tsx` por uma
   chamada a `supabase.auth.signInWithPassword(...)`.

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
