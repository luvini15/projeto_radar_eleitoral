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
