# 🏛️ Documentação Oficial de Infraestrutura e Deploy

**Projeto:** Radar Eleitoral
**Revisão:** 1.2 (Consolidação de Infraestrutura Cloud e Amarração de Perímetro de Segurança)
**Escopo:** Mapeamento arquitetural, esteira de deploy (zero-to-production) e sustentação.

## 1. Mapeamento de Serviços e Contas Vinculadas

O sistema opera sob uma arquitetura de microsserviços distribuída, separando banco de dados, regras de negócio/background jobs e interface de usuário.

### 1.1. Topologia de Dependências

A comunicação entre os componentes segue um fluxo unidirecional e rigorosamente autenticado:
`[Vercel / Frontend]` ➔ consome ➔ `[Railway / Backend API]` ➔ consome ➔ `[Supabase / Banco de Dados]`

### 1.2. Matriz de Provedores e Contas

Para mitigar bloqueios de permissões (especialmente restrições do plano Hobby da Vercel), a infraestrutura foi vinculada da seguinte forma:

| Serviço (Provedor) | Finalidade | Responsável / Conta | Observações de Integração | 
| ----- | ----- | ----- | ----- | 
| **GitHub** | Versionamento de Código | `luvini15` (Proprietário) | Repositório deve ser **Público** para permitir deploys automatizados no plano gratuito da Vercel. Colaboradores (`caiothomasbandeira`) integram via pull requests/commits. | 
| **Supabase** | DB (PostgreSQL) e Auth | `accdatapath` (Admin) | Fornece as credenciais de conexão seguras. Autenticação restrita via políticas de redirecionamento (Redirect URLs). | 
| **Railway** | API FastAPI & Scheduler | `accdatapath` (Admin) | Hospeda os contêineres Docker (diretório `/backend`). Requer liberação de CORS para o domínio do Frontend. | 
| **Vercel** | Frontend (React/Vite) | `accdatapath` / `luvini15` | Conectado via importação de URL direta do GitHub para contornar bloqueios de times no plano Hobby. | 

## 2. Guia de Credenciais e Variáveis de Ambiente

> ⚠️ **Atenção (InfraSec):** As chaves abaixo nunca devem ser commitadas no repositório. Elas devem ser injetadas exclusivamente nos painéis de ambiente de cada provedor Cloud.

### 2.1. Frontend (Vercel)

Variáveis injetadas no ambiente de *Production* (Settings > Environment Variables):

* `VITE_SUPABASE_URL`: Endpoint REST do Supabase (Ex: `https://ecppunyfnbluulyaurkz.supabase.co`).

* `VITE_SUPABASE_ANON_KEY`: Chave pública JWT do Supabase (Segura para exposição no client-side).

* `VITE_API_URL`: Domínio público da API no Railway. **(CRÍTICO: Inserir sem a barra `/` no final).**

* `VITE_CAMPAIGN_ID`: Identificador de escopo do frontend (Atualmente `1`).

### 2.2. Backend (Railway)

Variáveis injetadas no serviço da API:

* `CORS_ORIGINS`: URL base de produção do frontend (Vercel).

* *Demais segredos locais:* Senhas do banco PostgreSQL, tokens de terceiros (ex: Apify) devem ser mantidos no Railway Variables, jamais no frontend.

## 3. Manual de Deploy (Passo a Passo)

Este roteiro descreve a esteira de implantação "zero-to-production". Siga estritamente esta ordem para evitar falhas de handshake entre os serviços.

### Fase 1: Provisionamento do Banco de Dados (Supabase)

1. Crie o projeto no Supabase e configure a base de dados PostgreSQL.
2. Navegue até **Project Settings > API**.
3. Extraia e documente a **Project URL** e a **anon / public key**.

### Fase 2: Implantação do Backend (Railway)

1. Conecte o repositório GitHub ao Railway.
2. Configure o deploy para apontar para o diretório `/backend` (Docker).
3. Após o build bem-sucedido, o Railway provisionará os serviços (API e Scheduler).
4. No painel do serviço da API, vá em **Networking > Generate Domain**.
5. Extraia e documente a URL pública gerada (Ex: `https://seu-backend.up.railway.app`).

### Fase 3: Implantação do Frontend (Vercel)

1. Certifique-se de que o repositório no GitHub (`luvini15/projeto_radar_eleitoral`) esteja marcado como **Public** (Settings > Change repository visibility). *Nota: O plano Hobby bloqueia forks/colaboradores em repositórios privados.*
2. Acesse a Vercel, clique em **Add New... > Project**.
3. Cole a URL pública do repositório no campo de busca (Import via URL) e pressione Enter.
4. Mantenha o preset como **Vite** e a raiz como `./`.
5. Adicione as 4 variáveis documentadas na seção `2.1` deste documento.
6. Clique em **Deploy**. Extraia e documente a URL final gerada (Ex: `https://radar-eleitoral.vercel.app`).

### Fase 4: Amarração do Perímetro de Segurança (Supabase Auth e CORS)

Com os domínios de Frontend e Backend provisionados, é mandatório estabelecer o perímetro de segurança da aplicação. Esta fase garante que a API rejeite origens não confiáveis (via validação de CORS) e que o serviço de autenticação proteja o fluxo de sessão contra ataques de redirecionamento aberto (*Open Redirect*).

**A. Configuração de Redirecionamento e Sessão (Supabase Auth):**
O Supabase atua como o *Identity Provider* (IdP). Ele precisa reconhecer o domínio da Vercel como um agente confiável para emitir e redirecionar os tokens JWT de sessão de volta para o cliente após um evento de login.

1. Acesse o painel do projeto no **Supabase** e navegue até **Authentication > URL Configuration**.
2. Em **Site URL**, defina a URL canônica (domínio base) da aplicação gerada pela Vercel (Ex: `https://radar-eleitoral.vercel.app`).
3. Em **Redirect URLs**, registre os URIs de callback autorizados. Clique em **Add URL** para mapear os seguintes caminhos exatos:
   * `https://radar-eleitoral.vercel.app/login` (Ponto de entrada de credenciais).
   * `https://radar-eleitoral.vercel.app/redefinir-senha` (Callback de recuperação de credenciais).
   * `https://radar-eleitoral.vercel.app/**` (Implementação de *wildcard* para permitir redirecionamentos de rotas dinâmicas geradas pelo React Router no Frontend).
4. Salve as alterações.

**B. Configuração de Política de Mesma Origem - CORS (Railway):**
A API no FastAPI aplica *middlewares* de validação rigorosos. Requisições (como Fetch/XHR) originadas fora do domínio explicitamente permitido serão bloqueadas pelo navegador durante a requisição de *preflight* (`OPTIONS`).

1. Acesse o painel do **Railway**, selecione o ambiente de produção e abra o serviço correspondente à **API** (FastAPI).
2. Navegue até a aba **Variables**.
3. Localize (ou crie via *New Variable*) a chave `CORS_ORIGINS`.
4. Atribua como valor a URL base da Vercel (Ex: `https://radar-eleitoral.vercel.app`).
   * 🚨 **ATENÇÃO CRÍTICA:** O valor deve ser inserido rigorosamente **sem a barra final (`/`)**. O middleware do FastAPI realiza uma correspondência exata de strings (*Exact String Matching*). Uma barra residual resultará em falha de validação de origem, causando bloqueios de comunicação `HTTP 403 / CORS Error` na interface web.
5. Ao modificar/inserir a variável, o Railway engatilhará automaticamente um novo build/redeploy do contêiner da API para injetar a nova diretiva de rede.

## 4. Guia de Sustentação (Manutenção e Troubleshooting)

Para garantir a saúde contínua da infraestrutura, atente-se aos seguintes cenários mapeados durante a homologação:

* **Bloqueio de Deploy na Vercel (Deployment Blocked):**
  * *Sintoma:* Erro *"The Hobby Plan does not support collaboration for private repositories"*.
  * *Causa:* Alguém tentou realizar um deploy ou conectar uma conta de terceiro enquanto o repositório estava configurado como `Private`.
  * *Solução:* Mantenha o repositório público ou faça upgrade da Vercel para o plano Pro.

* **Avisos "RLS Disabled in Public" (Supabase):**
  * *Sintoma:* Alertas de segurança "CRITICAL" no painel do banco de dados (ex: tabelas `generated_reports`, `administrative_regions`, `instagram_posts`, `alembic_version`).
  * *Risco:* Sem RLS (Row Level Security), dados podem ser lidos/manipulados publicamente caso a chave anônima vaze.
  * *Ação Futura:* Acessar Authentication > Policies e habilitar RLS nestas tabelas, permitindo operações exclusivamente originadas pelo *Service Role* do backend (Railway).

* **"Limited Access / Deploys Paused" (Railway):**
  * *Sintoma:* API atual em execução (Status Online), mas novos commits no GitHub não iniciam o build.
  * *Solução:* Verifique os limites de execução do plano gratuito (horas mensais esgotadas) ou pendências de verificação de conta (ex: inclusão de cartão) no painel de Billing do Railway.