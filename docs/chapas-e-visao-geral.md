# Chapas e Visão Geral

Uma campanha monitorada continua sendo o conjunto já coletado. Dentro dela, chapas agrupam explicitamente candidato, vice e associados. Principal/Concorrente são papéis de monitoramento; não definem uma chapa. Nenhuma associação é inferida automaticamente.

## Configuração

Em Configurações, mantenha os perfis existentes, crie as chapas e escolha perfil e posição. Um perfil pode ficar independente. Dentro de uma campanha monitorada, cada perfil pertence a no máximo uma chapa; candidato e vice são únicos por chapa. Desvincular preserva perfil, posts, snapshots e histórico de coleta.

O topo mantém a campanha monitorada e acrescenta o seletor de chapa. Todas as análises respeitam esse recorte. Filtros adicionais por perfil são subordinados à chapa. A comparação reúne as chapas configuradas e permite incluir explicitamente outra campanha monitorada. A configuração e a coleta continuam abrangendo a campanha monitorada inteira.

## Indicadores e limites

Visão Geral usa somente dados armazenados, a última métrica disponível de cada post, o período e a amostra exibidos. Médias de chapas são calculadas sobre os posts com métrica disponível, nunca pela soma de médias de perfis. Zero observado é diferente de métrica ausente. Seguidores somam perfis, não pessoas únicas. Evolução agregada só utiliza datas com observações de todos os membros; não há interpolação ou preenchimento com zero.

O gráfico diário agrupa totais observados por data de publicação; não representa interações novas recebidas naquele dia. A escala opcional de raiz quadrada mantém os valores exatos no eixo e no tooltip. Temas e horários descrevem associações observadas, sem causalidade ou inferência de apoio eleitoral.

IA recebe agrupamentos explícitos, posições e métricas agregadas. Chapas não configuradas não podem ser comparadas como se existissem. A coleta e seus agendadores não foram substituídos.

## Migração

Antes de iniciar a versão atualizada do backend, no diretório backend execute `.venv/Scripts/python.exe -m alembic upgrade head`. A revisão `0006_campaign_slates` cria apenas `campaign_slates` e `slate_members`, sem atualizar tabelas de coleta. O rollback de código preserva os agrupamentos cadastrados.

## Verificação

Backend: `python -m unittest discover -s tests -v` em ambiente de teste isolado. Frontend: `npm run build`. Os testes de chapas verificam isolamento, candidato/vice, métricas ausentes, médias ponderadas e migração aditiva sem perda de snapshots.

## Resultado da validação local — 22/10/2026

- 102 testes backend aprovados: autenticação, coleta, chapas, isolamento, médias, migração, perfis inativos e consistência UTC.
- 9 testes frontend de métricas/filtros aprovados.
- Teste de navegador aprovado em `tests/slates-ui-smoke.mjs`: navegação, agrupamento, filtro por perfil, dados insuficientes de seguidores, barras com outlier, tooltips, cadastro/desvinculação e 11 rotas em viewport de 390 px sem overflow.
- Build TypeScript/Vite aprovado. Lint sem erros, com avisos de Fast Refresh em componentes já existentes.
- Migração aplicada no banco configurado. Hashes SHA-256 antes e depois confirmaram preservação integral das tabelas verificadas, inclusive após reiniciar a API: 3 campanhas, 37 vínculos, 51 perfis, 1.943 posts, 3.617 snapshots de posts, 148 snapshots de perfis, 1.655 amostras de comentários e 16 coletas.
- Os endpoints de Visão Geral e comparação responderam 200 para as três campanhas reais. Nenhuma associação de candidato/vice foi inferida ou criada nos dados reais.

### Reproduzir o teste visual isolado

No backend, execute `python -m tests.serve_slate_fixture`. Ele cria um SQLite descartável com dados explicitamente sintéticos e atende em 127.0.0.1:8011, sem Apify/OpenRouter. Em outro terminal, inicie o Vite em 5175 com `VITE_API_URL=http://127.0.0.1:8011` e `VITE_DEV_AUTH_BYPASS=true` no ambiente do processo. Na raiz, execute `node tests/slates-ui-smoke.mjs`. Essa configuração não deve substituir o ambiente da aplicação real.
