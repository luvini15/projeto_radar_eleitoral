# Períodos, comparações e histórico manual — rodada local

## Entrega e limites
Alterações incrementais sobre Campanha → Chapa → Perfil → Posição. Coletas continuam individuais, com o mesmo backend e banco. Nenhum commit, push, deploy Vercel, variável ou infraestrutura de produção foi alterado. Não foram implementados sentimento, classificação eleitoral, demografia ou inferências de voto.

## Arquivos desta rodada
Backend:
- `app/database.py`: validação compartilhada de período e amostra via dependência existente.
- `app/services/analysis_period.py` (novo): limites inclusivos de dias completos em UTC, com limite superior exclusivo.
- `app/services/follower_history.py` (novo): observações diárias, prioridade por origem, agregação em datas comuns e crescimento.
- `app/services/manual_followers.py` (novo): importador local aditivo, transacional, idempotente e sem sobrescrita.
- `data/manual_followers_2026_10.json` (novo): 68 observações originais, origem/proveniência e variações fornecidas.
- `app/services/executive.py`: crescimento, séries, dimensões e amostra dentro do período antes da limitação.
- `app/services/trends.py`: respeito ao período/amostra e ausência explícita de comparação anterior quando não consultada.
- `app/routers/analytics.py`: datas e histórico de seguidores identificando origem.
- `app/routers/filtered_analytics.py`: período, amostra por perfil e observações diárias consolidadas.
- `app/routers/executive.py`: endpoint reutilizável de comparação.
- `app/routers/collections.py`: filtro de leitura por período/perfis e contadores/erros apenas dos perfis selecionados.
- `tests/test_temporal_comparison.py` (novo): 13 testes de regressão novos.

Frontend:
- `src/lib/CampaignProvider.tsx`, `src/lib/campaignContext.ts`: período, amostra e perfil compartilhados, persistência e atualização das consultas.
- `src/utils/analysisPeriod.ts` (novo): calendários UTC e validação.
- `src/components/dashboard/PeriodSelector.tsx` (novo): presets, calendário e aplicação explícita do intervalo válido.
- `src/components/dashboard/GlobalProfileFilter.tsx` (novo): perfis subordinados à chapa.
- `src/components/dashboard/ComparisonExplorer.tsx` (novo): comparador reutilizável, gráficos e tooltip com valores exatos.
- `src/components/dashboard/TerritorialFilters.tsx`, `SlateComparison.tsx`: integração dos filtros e datas visíveis.
- `src/components/layout/Topbar.tsx`, `DashboardLayout.tsx`: controles compartilhados, amostra também no móvel e título do alias Inteligência.
- `src/services/campaignScope.ts`, `src/services/api.ts`: propagação dos filtros de leitura; configurações e execução de coletas preservadas.
- `src/types/comparison.ts` (novo), `src/types/executive.ts`, `src/types/radar.ts`: contratos com crescimento, origem e comparações.
- Páginas `ExecutiveOverview`, `Audience`, `Comparison`, `Topics`, `Content`, `Collections`, `Trends`, `Reports`, `TerritorialIntelligence`: integração incremental.
- `src/components/charts/FollowersAreaChart.tsx`, `ReachInteractionsChart.tsx`: linhas mais legíveis.
- `src/App.tsx`: alias `/inteligencia`, preservando `/inteligencia-territorial`.
- `tests/analysis-period.test.mjs`, `tests/temporal-ui-smoke.mjs` (novos); ajuste de `tests/slate-metrics.test.mjs` para leitura filtrada de Coletas.
- Este relatório. Arquivos já modificados de rodadas anteriores foram preservados.

## Banco e importação
Nenhuma alteração de schema, tabela ou migration nova. Nenhuma migration aplicada ao banco local nesta rodada. Os testes de migração existentes executam exclusivamente em bases temporárias.

Os 68 registros foram inseridos em `profile_snapshots`, aproveitando o campo `source` existente com valor **MANUAL_HISTORICAL**. Cada perfil recebeu 17 observações, de 05/10/2026 a 21/10/2026. Não foi inserida a observação manual da Dora em 22/10.

A data é uma observação diária: o horário real não foi informado. O timestamp técnico é 12:00 UTC para manter o dia estável, sem alegar que esse foi o horário da observação. O arquivo JSON preserva a proveniência e as variações informadas; a variação de 05/10 não é usada para inventar uma observação em 04/10.

O importador faz preview por padrão e exige `--apply`, ambiente de desenvolvimento e banco local para gravar. Resolve os quatro perfis existentes pelo username e exige vínculo à campanha escolhida. Não cria perfis, não altera associações e rejeita divergência em um histórico manual já existente.

Comandos em `backend`:
```
.venv/Scripts/python.exe -m app.services.manual_followers --campaign-id 3
.venv/Scripts/python.exe -m app.services.manual_followers --campaign-id 3 --apply
```
Resultado local: preview 68, primeira aplicação 68, repetição 0 inseridos/68 já existentes.

A comparação SHA-256 confirmou que todos os registros originais permanecem idênticos: 1943 posts, 3617 snapshots de posts, 148 snapshots originais de perfis, 1655 amostras de comentários, 16 execuções de coleta e 146 execuções por perfil. Somente os 68 snapshots manuais foram acrescentados, totalizando 216 snapshots de perfis.

## Datas e hierarquia
Presets: 7, **15**, 30, 60, 90, 180 e 365 dias. O dia atual UTC conta como um dos dias. Personalizado aceita intervalos válidos inclusive superiores a 365 dias; backend e frontend rejeitam inversão e datas inválidas. Datas vazias/invertidas não podem ser aplicadas.

Limites: início à meia-noite UTC, fim no início do dia seguinte, exclusivo. Isso inclui todo o último dia sem truncar microssegundos. Horários e dias da semana de publicação continuam usando a regra de São Paulo já existente; a seleção de datas e as séries diárias continuam em UTC.

Campanha → Chapa → Perfil. Trocar campanha/chapa limpa o perfil subordinado. O seletor de perfil mostra somente os ativos do recorte. As opções individuais locais continuam disponíveis. No móvel, o cabeçalho acompanha a rolagem para que o calendário não cubra os gráficos; em telas maiores continua fixo. Amostra e período são compartilhados; limites são aplicados por perfil **depois** do filtro por data.

Operações administrativas usam campanha completa. Execução manual/automática de coleta continua com os perfis ativos da campanha completa, independentemente do recorte de leitura. Em Coletas, período e perfis filtram o histórico exibido; status é da execução original, contadores e erros são dos perfis selecionados.

Tendências/Inteligência preservam seus grupos de monitoramento. Com um período explícito, não consultam uma janela anterior fora dele: variação de volume e rótulo emergente ficam sem base, com explicação metodológica. Os clientes antigos sem período compartilhado mantêm a comparação anterior existente.

## API
Novo: **GET /api/campaigns/{campaign_id}/comparison**. Retorna `period`, `posts_per_profile`, `slates` e `profiles`. Cada entidade tem resumo, temas, formatos, horários, série diária de publicações e histórico de seguidores. Chapas são comparadas explicitamente dentro da campanha; perfis ficam subordinados ao recorte global.

Ampliados: `executive`, `slate-comparison`, `followers-history`, leitores de posts/temas/horários/benchmark, `analytics`, `trends`, `intelligence` e GET `collections`. Parâmetros comuns: `period_start`, `period_end`, `analysis_days`, `sample_limit`, `slate_id`, `scope_profile_id`. Os caminhos e contratos anteriores foram mantidos, com campos adicionais de origem/crescimento quando aplicável.

`followers-history` consolida uma observação por perfil/dia. Uma contagem real disponível tem prioridade sobre a manual no mesmo dia, mesmo se registrada mais cedo. Isso não apaga nenhum snapshot. Observação real sem contador não apaga uma contagem manual disponível. Novos dias reais prolongam naturalmente a série.

## Agregação e gráficos
- Totais: somente valores disponíveis; zero observado continua zero e ausência continua nula.
- Médias: soma dos valores disponíveis dividida pelo número de posts que têm a métrica; nunca média simples das médias dos perfis.
- Frequência: quantidade de posts da amostra dividida pelo número de dias completos do intervalo.
- Seguidores: soma de audiências dos perfis, sem afirmar pessoas únicas. Cobertura parcial continua identificada.
- Crescimento de chapa: diferença entre primeira e última datas comuns completas; percentual usa a primeira soma como denominador. Requer duas datas comparáveis e denominador válido.
- Histórico: sem interpolação e sem completar ausência com zero; uma série agregada só usa dias com contagem de todos os membros necessários.
- Diário: último snapshot armazenado por data de publicação UTC; não representa interações novas recebidas naquele dia. Métricas dos posts não são reconstruídas retroativamente como se fossem snapshots daquele dia.

Comparação tem nível explícito Chapas/Perfis e dimensões Indicadores, Evolução, Diário, Tema, Formato e Horário. Métricas incluem seguidores, crescimento absoluto/percentual, posts, curtidas, comentários, plays, views, interações, médias e frequência.

Barras são o padrão. Linha é usada para evolução/diário. Pizza só representa participação de métricas somáveis não temporais, com poucos itens; nunca médias, taxas, crescimento ou séries temporais. Em temas/formatos/horários, pizza exige uma entidade selecionada para mostrar sua composição. Categorias ausentes não viram zero.

Escala de raiz quadrada é opcional onde válida; valores, eixos e tooltips permanecem reais. Valores negativos não usam raiz. Tooltips identificam origem, valores exatos, variação entre observações e amostra/média quando pertinentes. Tabelas expansíveis permitem conferir números sem depender de hover. Novos gráficos usam linhas de 3 px, pontos visíveis, contraste e a paleta escura/laranja existente.

## Conferência de 05/10 a 21/10
| Entidade | 05/10 | 21/10 | Crescimento observado |
|---|---:|---:|---:|
| @celinaleao | 342377 | 353720 | 11343 |
| @gustavo.rochadf | 8396 | 9671 | 1275 |
| Chapa Celina | 350773 | 363391 | 12618 |
| @leandrograss | 143253 | 166906 | 23653 |
| @doragomes_oficial | 4563 | 5023 | 460 |
| Chapa Grass | 147816 | 171929 | 24113 |

## Validação
- 128 testes backend passaram, incluindo 13 novos e os testes existentes de autenticação, coleta, chapas, administração e migração.
- 12 testes JavaScript passaram: calendário UTC, escopo, métricas diárias e agregação de seguidores.
- Build Vite/TypeScript passou, com aviso de bundle maior que 500 kB.
- Lint sem erros; avisos de Fast Refresh de componentes existentes.
- Teste visual temporal: calendário de 15 dias/customizado/invertido, totais manuais exatos, origem no tooltip, hierarquia, pizza/médias/linha, 11 rotas, desktop/768/390 px. Passou sem erros de execução e sem chamadas de API com falha.
- Teste visual existente de chapas: passou, incluindo outlier, tooltip, análise individual e preservação ao associar/desvincular.
- Continuidade local real confirmada: os quatro perfis têm 18 dias de observação até 22/10, com último ponto APIFY_PUBLIC. Capturas carregadas inspecionadas em desktop e 390 px.
- Regressão administrativa existente: passou, incluindo edição, transferência com rollback, desvinculação, remoção/reativação, arquivamento/restauração, identidade estável e desktop/tablet/390 px.

## Como usar
1. Abra http://localhost:5173/visao-geral e escolha a campanha **Chapa Celina** (ID 3, a campanha que contém os quatro perfis).
2. Escolha Todas as chapas e perfis ou uma chapa. O perfil global e os filtros adicionais ficam subordinados à escolha.
3. Em Período analisado, escolha 15 dias ou Personalizado. Preencha 05/10/2026 e 21/10/2026 e clique Aplicar período.
4. Confira os indicadores e o crescimento. No primeiro gráfico, alterne Comparar chapas/Comparar perfis; os rótulos mostram Candidato e Vice.
5. No comparador, escolha métrica, dimensão e visualização. Para composição por formato, selecione uma entidade e uma métrica somável antes de escolher Pizza.
6. Ative raiz quadrada para ler outliers, passe o cursor sobre pontos/barras e expanda Valores exatos da comparação.
7. Repita em Audiência, Temas e formatos, Conteúdos e Concorrentes. As tabelas existentes continuam disponíveis. Período/chapa/perfil também são propagados a Dias e horários, Coletas, Tendências, Relatórios e Inteligência.
8. Para conferir continuidade, amplie o fim para 22/10: dados reais existentes entram com sua origem; nenhum dado manual da Dora em 22/10 foi inserido.
9. Configurações continua administrando a campanha inteira e preservando todo o histórico ao remover agrupamentos.
