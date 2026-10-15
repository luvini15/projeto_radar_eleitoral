# Segurança e operação

Estas instruções se aplicam ao frontend da raiz (`src/`) e à API em `backend/`. O diretório `radar-eleitoral/` contém um frontend antigo com login simulado e não deve ser publicado.

## Configuração obrigatória

O acesso real depende de um projeto Supabase Auth. Configure política de senha forte, confirmação de e-mail, proteção contra tentativas de login e duração do JWT. Mantenha TOTP habilitado no provedor. O MFA é opcional no cadastro: a API aceita `aal1` quando a conta não possui fator verificado e exige `aal2` quando o usuário optou pelo recurso e concluiu a verificação do QR Code. O Supabase gerencia o hash das senhas; o Data Sight não armazena senhas. A API limita a sessão a 30 minutos sem atividade e 12 horas desde o primeiro acesso; configure `SESSION_IDLE_MINUTES` e `SESSION_MAX_HOURS` se necessário.

O formulário de cadastro pode permanecer disponível com inscrições públicas habilitadas no Supabase. Depois de confirmar o e-mail ou entrar com Google, a primeira requisição autenticada cria automaticamente uma linha em `app_users` com a função `analyst`. Para acesso somente por convite, desative inscrições públicas no Supabase e use o mesmo frontend apenas para login e recuperação.

1. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `.env.local`. A chave publicável é apropriada para o navegador; nunca use `service_role` nele.
2. Configure `SUPABASE_URL` e `SUPABASE_ANON_KEY` no ambiente do backend. `ADMIN_EMAILS` pode promover um e-mail conhecido no primeiro acesso; `ADMIN_USER_IDS` continua aceito apenas como compatibilidade de bootstrap. Usuários comuns não precisam de variáveis no ambiente.
3. Configure `DATABASE_URL`, `APIFY_TOKEN` e `OPENROUTER_API_KEY` somente no servidor. Revogue e substitua qualquer chave ou senha que já tenha sido publicada.
4. Configure `CORS_ORIGINS` apenas com as origens HTTPS do frontend. Em desenvolvimento, localhost é o padrão.
5. Defina uma senha aleatória em `POSTGRES_PASSWORD` para o Compose. O banco só publica a porta em `127.0.0.1`; em produção, remova a publicação da porta se os serviços estiverem na mesma rede privada.

### URLs de autenticação e Google

Em **Authentication > URL Configuration**, configure a URL pública oficial como Site URL. Para desenvolvimento, adicione `http://localhost:5173/**` às Redirect URLs. Os caminhos usados pelo frontend são `/login` para confirmação e retorno do Google, e `/redefinir-senha` para recuperação.

Para login com Google, crie um cliente OAuth do tipo **Web application** no Google Auth Platform. Use `http://localhost:5173` como origem JavaScript de desenvolvimento e `https://zunxahgmcwktkavstykd.supabase.co/auth/v1/callback` como Authorized redirect URI. Depois, copie Client ID e Client Secret para **Authentication > Providers > Google** no Supabase. O recurso **OAuth 2.1 Server** do Supabase é destinado a transformar o Data Sight em provedor OAuth para outros aplicativos e não substitui a configuração do provider Google.

Copie `.env.compose.example` para `.env` na raiz e substitua a senha antes de iniciar o Compose. Para menor privilégio no banco, use `MIGRATION_DATABASE_URL` com a conta proprietária apenas na implantação, configure `APP_DB_PASSWORD`, rode `backend/scripts/provision_db_role.py` após a migração e aponte `DATABASE_URL` da aplicação para `radar_app`. Essa conta recebe apenas leitura, inserção e atualização; não recebe DDL nem exclusão. Remova as credenciais da conta proprietária do processo da API.

O painel deve ser servido por HTTPS. [Caddyfile.example](Caddyfile.example) traz um exemplo de TLS, proxy e cabeçalhos; substitua domínio, diretório e projeto Supabase. Rode o backend em `127.0.0.1:8000`, atrás do proxy. O build de produção usa a API na mesma origem se `VITE_API_URL` estiver vazio. Não coloque segredos em variáveis `VITE_*`, pois elas entram no JavaScript público.

## Banco, migrações e rollback

Instale `backend/requirements.txt`. Para instalação nova, execute de dentro de `backend`:

```powershell
.venv/Scripts/alembic.exe upgrade head
```

O servidor deixou de criar tabelas automaticamente. Em um banco existente criado pelo código antigo, faça e verifique um backup antes da primeira implantação; confirme que as tabelas antigas de `app.models` existem, execute `alembic stamp 0001_baseline` e então `alembic upgrade head` para criar `auth_sessions`. Futuras alterações de esquema devem ganhar uma revisão Alembic com `upgrade` e `downgrade`.

Rollback: interrompa gravações e coletas, faça backup, reverta a versão do aplicativo e execute o `downgrade` específico da revisão nova somente se a migração for reversível e testada. O `downgrade base` da revisão inicial **apaga todas as tabelas e dados**; não o execute em produção. Para perda ou corrupção de dados, restaure um backup em um banco vazio e valide contagem de linhas, integridade e login antes de voltar a servir tráfego.

## Backup, criptografia e recuperação

Configure `BACKUP_ENCRYPTION_KEY` com uma chave Fernet gerada por `Fernet.generate_key()`, guardada em um gerenciador de segredos separado dos backups. Configure `BACKUP_DIR` em um volume persistente com acesso restrito, cópia fora do host e criptografia do volume do PostgreSQL. Execute `backend/scripts/backup.py` diariamente no agendador do host a partir da raiz do projeto. O script usa `pg_dump -Fc`, cifra o arquivo e mantém 30 dias por padrão (`BACKUP_RETENTION_DAYS`). Não reutilize o mesmo disco como única cópia.

Restauração testada: em um host isolado, execute `python backend/scripts/restore.py CAMINHO_DO_ARQUIVO.dump.enc --confirm` na raiz do projeto, com a chave Fernet no ambiente. O comando substitui os dados do banco Compose selecionado. Valide `alembic current`, tabelas, dados e API. Faça esse ensaio periodicamente. A chave de backup perdida torna os arquivos irrecuperáveis.

O banco guarda dados coletados em texto claro para permitir consultas. Por isso, a criptografia em repouso do volume do banco e dos snapshots da infraestrutura é obrigatória em produção. O script cobre os arquivos de backup que ele gera; não cifra automaticamente o volume ativo.

## Monitoramento e limites

Agende `backend/scripts/monitor.py` a cada cinco minutos com `HEALTH_URL` HTTPS, `BACKUP_DIR` e `ALERT_WEBHOOK_URL` HTTPS. Ele alerta quando a API falha ou o backup passa de 26 horas (`BACKUP_MAX_AGE_HOURS`). Encaminhe stdout/stderr do backend e do monitor ao coletor de logs, restrinja acesso aos logs e alerte para eventos `invalid_token`, `mfa_required`, `access_denied`, `write_denied`, `rate_limited` e `auth_provider_unavailable`. Nunca registre tokens, senhas ou corpos de requisição.

O limite por usuário é de 60 fotos, 120 leituras e 20 gravações por minuto. Ele é em memória por processo; em implantação com várias instâncias, configure um limite compartilhado no proxy ou use armazenamento compartilhado. O limite de login deve ser configurado no Supabase Auth, pois a senha é verificada lá.

O acesso de analista é somente leitura na API; apenas linhas de `app_users` com `role = 'admin'` podem gravar e iniciar coletas que consomem créditos. `ADMIN_EMAILS` e `ADMIN_USER_IDS` servem somente para o bootstrap administrativo. Para revogar acesso, defina `active = false` em `app_users` e encerre a sessão no Supabase. A interface pode exibir controles que serão recusados pela API para analistas.

## Verificação

```powershell
npm run build
npm audit
backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t backend
```

Atualize dependências em janelas regulares e rode auditorias de npm e Python no CI. Teste o backup, restauração, migração e rollback em uma cópia antes de publicar.
