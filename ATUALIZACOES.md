# Radar Eleitoral — Atualizações

## 04/09/2026 — Inteligência territorial

- Catálogo das 35 RAs do DF, sem população presumida, e associação perfil–região.
- Taxonomia extensível e classificação baseada somente na legenda.
- Tendências por período/região/tema, comparação anterior e score documentado.
- Estados sem dados/dados insuficientes, evidências, alertas, problemas e oportunidades.
- Novas telas Tendências e Relatórios; HTML executivo imprimível em A4/PDF.
- Migração aditiva `backend/migrations/001_territorial_intelligence.sql`.
- Token removido do exemplo; qualquer credencial anteriormente exposta deve ser revogada.
- Google Trends, notícias, comentários/sentimento e IA seguem não configurados, sem simulação.

## 06/09/2026 — Monitoramento contínuo

- Coleta diária configurável em processo separado, sem acoplamento ao ciclo da API.
- Execuções e saúde registradas globalmente e por perfil, incluindo falhas parciais.
- Posts idempotentes por `shortcode`; métricas e seguidores preservados como snapshots.
- Endpoint analítico com filtros reais de período, RA, perfis, tema e formato.
- Nova tela Coletas com próxima execução, contadores e histórico.
- Comparação multisseleção de perfis, séries diárias, temas e formatos.
- Migration aditiva `002_continuous_monitoring.sql` e testes de reprocessamento/falhas.

### Refinamento da comparação

- Filtros de período, RA, múltiplos perfis, tema e formato aplicados no backend.
- KPIs compactos com distinção rigorosa entre zero e N/D.
- Ranking horizontal com seleção de uma métrica por vez.
- Publicações e interações diárias separadas em escalas independentes.
- Volume e interação média por formato separados.
- Dispersão tema × desempenho com quadrantes e tooltip analítico.
- Heatmap tema × perfil com volume e interação média contextual.
- Evolução de seguidores com variação entre snapshots.
- Tabela detalhada preservada como camada final da análise.

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

<POSTGRES_PASSWORD_LOCAL>

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

