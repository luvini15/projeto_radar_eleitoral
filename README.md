# Radar Eleitoral

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

## Integração inicial do frontend com o backend

Em `/configuracoes`, é possível listar/criar campanhas, vincular perfis do Instagram,
executar a sincronização pela Apify e consultar o resumo dos dados armazenados.
As demais páginas continuam usando dados demonstrativos.

O frontend usa `VITE_API_URL` (padrão: `http://localhost:8000`). Para alterar,
defina essa variável em `.env.local` e reinicie o Vite. O backend deve estar
rodando e permitir a origem do frontend no CORS. Configure `DATABASE_URL` e
`APIFY_TOKEN` somente em `backend/.env`; nunca coloque o token em variáveis `VITE_`.

A coleta só acontece ao clicar em **Coletar dados pela Apify** e consome créditos.
O resumo considera até 25 posts recentes por perfil, com o último snapshot disponível.
Falhas de coleta podem deixar resultados parciais no banco; recarregue os dados
antes de repetir uma coleta. A autenticação do protótipo continua simulada.
## Frontend conectado ao backend

Todas as telas do painel consultam a campanha selecionada no cabe?alho:

- Vis?o geral: totais e compara??o por perfil.
- Conte?dos: busca por perfil/legenda, filtro de formato, ordena??o e detalhes.
- Temas e formatos: classifica??o por palavras-chave e m?dias dispon?veis.
- Dias e hor?rios: desempenho por faixas de tr?s horas em S?o Paulo.
- Audi?ncia: hist?rico de seguidores e compara??o entre perfis.
- Intelig?ncia: rankings de coment?rios, intera??es, visualiza??es e reprodu??es.
- Configura??es: cria??o de campanhas, v?nculo de perfis e coleta pela Apify.

A sele??o da campanha fica salva neste navegador. O limite do cabe?alho controla
quantos posts recentes por perfil entram na an?lise; n?o ? um filtro de datas.
Em Audi?ncia, o per?odo de 7/30/90 dias controla apenas o hist?rico de seguidores.
Recarregar consulta o banco novamente; a coleta paga s? ? iniciada em Configura??es.
M?tricas ausentes aparecem como ?, e intera??es podem ser parciais. Demografia,
alcance, visitas e cliques n?o s?o fornecidos pela integra??o atual.

Defina `VITE_API_URL` em `.env.local` (padr?o `http://localhost:8000`) e reinicie o
Vite se alterar o endere?o. Configure `DATABASE_URL` e `APIFY_TOKEN` somente no
`backend/.env`. Nunca coloque o token em vari?veis `VITE_`. O backend deve permitir
a origem do frontend no CORS. A autentica??o do prot?tipo continua simulada.

### Verifica??o da integra??o

Build e lint na raiz: `npm run build` e `npm run lint`.

Testes do backend, dentro de `backend`:

```powershell
.venv/Scripts/python.exe -m unittest discover -s tests -p test_*.py
```

Para reproduzir o teste de navegador sem consumir cr?ditos nem alterar campanhas:

1. Inicie o frontend na raiz com `npm run dev` (porta 5173).
2. Dentro de `backend`, inicie `.venv/Scripts/python.exe -m tests.serve_ui_fixture`.
   Esse servidor usa a porta 8001 e um SQLite tempor?rio com dados de teste.
3. Na raiz, execute `node tests/ui-smoke.mjs`. O Playwright deve ter Chromium
   instalado (`npx playwright install chromium`, se necess?rio).
4. Encerre o servidor de teste ap?s a execu??o.

O teste redireciona as chamadas somente no navegador de teste para a porta 8001.
Ele cobre as seis telas de an?lise, filtros, sele??o persistida, aus?ncia de dados,
falhas de rede e largura de celular. As capturas ficam em `node_modules/radar-*.png`.

### Atualização automática

O painel consulta a API a cada 60 segundos enquanto a aba estiver visível,
e recarrega ao voltar à aba ou recuperar a conexão. A leitura periódica não
executa Actors. As telas preservam os dados durante o recarregamento.

Para coletar dados novos automaticamente, configure no `backend/.env`:

```env
AUTO_SYNC_CAMPAIGN_IDS=2
AUTO_SYNC_INTERVAL_HOURS=6
AUTO_SYNC_POST_LIMIT=25
```

Substitua `2` pelo ID da campanha desejada. IDs separados por vírgula permitem
mais campanhas; deixe vazio para desativar. Reinicie o backend após alterar.
A coleta usa créditos Apify, considera somente campanhas/perfis ativos e começa
no primeiro minuto do servidor quando ainda não existe agendamento registrado.
A próxima tentativa fica persistida antes de iniciar a coleta: uma falha ou
reinicialização não dispara novas tentativas antes do intervalo. Resultados de
uma execução interrompida podem ser parciais.

Consulte o andamento em Configurações ou `GET /api/sync/status`. Execute o backend
com **um único worker**; o bloqueio de coletas simultâneas é local ao processo.
O agendamento só funciona enquanto o computador e o backend estiverem ligados.
Para operação contínua, será necessário hospedar o backend em um servidor.
