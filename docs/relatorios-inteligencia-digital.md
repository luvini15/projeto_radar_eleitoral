# Relatórios de Inteligência Digital — entrega local

## Acesso e uso
- Criar e consultar documentos: http://localhost:5173/relatorios
- Novo relatório: http://localhost:5173/relatorios/novo
- Exemplo real, Chapa Celina, 05–21/10/2026: http://localhost:5173/relatorios/7
- Exemplo real comparativo Celina × Grass: http://localhost:5173/relatorios/8
- PDF de exemplo inspecionado: `tmp-data-sight-report.pdf`, na raiz do frontend.

Selecione a campanha monitorada **Chapa Celina (ID 3)**, que contém os quatro perfis. Escolha chapa, perfil opcional, amostra e datas. Ative a comparação e marque pelo menos duas chapas quando desejado. Clique **Gerar relatório**. O documento tem índice, navegação entre seções, Alterar filtros e Exportar relatório. O gerador territorial anterior continua acessível em um bloco próprio na mesma página.

**Exportação:** o menu oferece downloads diretos de HTML autônomo e PDF, sem impressão manual. Ambos preservam o documento atual e suas visualizações. O PDF usa Chromium offline; detalhes e pré-requisitos na seção de exportação direta ao final.

## Arquivos desta rodada
Novos:
- `backend/app/services/digital_reports.py`: composição, metodologia, insights determinísticos, seleção de evidências e persistência do documento.
- `backend/app/routers/digital_reports.py`: geração, listagem, leitura e imagens previamente armazenadas.
- `backend/tests/test_digital_reports.py`: 15 testes isolados novos.
- `src/pages/DigitalReport.tsx`: página editorial protegida e exportação.
- `src/pages/LegacyReports.tsx`: gerador territorial anterior preservado, sem mudança de sua implementação.
- `src/components/reports/ReportCharts.tsx`: barras, composição, comparações, histórico e estados insuficientes.
- `src/components/reports/ReportImage.tsx`: imagem real de cache/URL armazenada e fallback explícito.
- `src/types/digitalReport.ts`: contrato do documento salvo.
- `src/styles/digital-report.css`: identidade editorial, responsividade e A4.
- `tests/digital-reports-ui.mjs`: geração real, filtros pelo botão Alterar filtros, comparações, HTML e casos sem dados/imagens. Downloads de PDF são validados por `tests/report-exports-ui.mjs`.
- Este relatório.

Alterados:
- `backend/app/main.py`: registro do router, mantendo middleware/autenticação existentes.
- `backend/app/services/campaign_scope.py`: recorte interno por múltiplos perfis, somente quando explicitamente fornecido pelo serviço de relatório.
- `backend/app/services/executive.py`: exposição aditiva dos grupos por dia da semana já calculados pelo serviço.
- `src/pages/Reports.tsx`: nova experiência de geração e lista de documentos salvos.
- `src/App.tsx`: rotas protegidas /relatorios/novo e /relatorios/:id.
- `src/components/layout/Topbar.tsx`: evita duplicar filtros analíticos no gerador, que possui filtros próprios.
- `src/components/layout/DashboardLayout.tsx`: título da rota de criação.
- `tests/temporal-ui-smoke.mjs`: reconhece os filtros próprios da nova página de relatórios.
- `tests/slates-ui-smoke.mjs`: intervalo de espera antes da bateria móvel para respeitar o limitador real da API; a proteção não foi alterada.

Arquivos de rodadas anteriores já modificados no workspace foram preservados. Não houve alteração de coleta, Apify, Supabase, autenticação, modelos, migrations ou configuração de ambiente nesta rodada.

## API
Todos os endpoints passam pela mesma autenticação e autorização existentes. Geração exige a permissão de escrita já exigida pelo sistema.

| Método | Endpoint | Resultado |
|---|---|---|
| POST | /api/campaigns/{id}/digital-reports | Salva o relatório e retorna ID/URL |
| GET | /api/campaigns/{id}/digital-reports | Lista os 20 documentos recentes por padrão; limite máximo 100 |
| GET | /api/digital-reports/{id} | Retorna exclusivamente o documento salvo |
| GET | /api/digital-reports/{id}/images/{post_id} | Serve somente imagem já em cache de um conteúdo pertencente ao documento |

Payload de geração:
```
{
  "start_date": "2026-10-05",
  "end_date": "2026-10-21",
  "slate_ids": [1],
  "profile_id": null,
  "compare_slates": false,
  "limit_per_profile": 25
}
```
Para comparar Celina × Grass na campanha 3, use slate_ids [1, 2] e compare_slates true. Perfil individual e comparação entre chapas não podem ser solicitados simultaneamente. Chapas/perfis de outra campanha são rejeitados. Datas inválidas/invertidas, amostras fora de 1–200 e comparação com menos de duas chapas são rejeitadas. O payload explícito prevalece sobre os filtros de leitura do painel.

Os endpoints territoriais anteriores de geração/HTML continuam existentes. Os novos documentos têm formato próprio; sua página React faz parte da mesma aplicação, sem uma segunda aplicação.

## Dados existentes e persistência
Reutiliza a tabela **generated_reports** e seus campos `structured_content`, `report_type`, datas e metadados. Tipo: DIGITAL_INTELLIGENCE_V1. Nenhuma tabela ou migration foi criada ou aplicada.

O documento salva filtros, nomes, associações, indicadores, séries, evidências, metodologia e data de geração. A reabertura não recalcula valores usando coletas posteriores. Alterar filtros cria outro documento. O backend só acrescenta linhas em generated_reports; não atualiza posts, perfis, snapshots, históricos, campanhas ou chapas.

Os cálculos reutilizam `executive_summary`, `campaign_posts`, `campaign_links`, calendário UTC, agregação de seguidores e médias existentes. Não existe uma metodologia paralela para relatórios. A exposição de dias da semana usa os mesmos agrupamentos que o serviço executivo já calculava.

A capa é exclusivamente tipográfica. Destaques usam as evidências reais de maior interação, comentários, plays e curtidas, deduplicando cards quando um mesmo post vence em várias métricas. Não há scraping, atualização de URL, geração de imagens nem nova coleta. Imagens disponíveis nos conteúdos são incorporadas na exportação; URLs inacessíveis recebem indicação de indisponibilidade. Nenhum valor é inferido para substituir ausência.

## Agregação e metodologia
- Datas são dias completos em UTC, com fim inclusivo e limite superior exclusivo no dia seguinte. A amostra é limitada por perfil depois do filtro por data.
- Posts são os efetivamente armazenados. Métricas vêm do último snapshot disponível da publicação no momento da geração, que pode ter sido coletado depois do período. O documento não afirma reconstruir contagens retroativas.
- Interações usam `interactions_count` armazenado. O normalizador existente soma curtidas, comentários, compartilhamentos e salvamentos disponíveis; se nenhum existe, mantém null. Completa exige os quatro componentes. Plays e views não são somados às interações.
- Totais usam valores disponíveis; médias usam o total da métrica dividido pelo número de posts com essa métrica. Não se faz média simples das médias dos perfis.
- Zero observado continua zero; ausência continua indisponível. Cobertura e componentes completos ficam identificados.
- Seguidores agregados somam audiências, sem deduplicar pessoas. Evolução exige datas comuns completas. Crescimento e percentuais vêm do serviço existente, exigindo duas observações e denominador válido. Não há interpolação nem dias adicionais inventados.
- Histórico manual mantém MANUAL_HISTORICAL e sua origem visual; coletas reais mantêm sua identificação. O relatório de 05–21/10 não cria nenhum ponto em 22/10.
- Dias e horários de publicação usam America/Sao_Paulo, como as análises existentes. São associações descritivas, sem causalidade.
- Insights são determinísticos e derivados exclusivamente dos indicadores. São até oito achados não idênticos, com empate explicitado; menos achados quando faltam métricas. Nenhuma IA, sentimento, demografia ou apoio eleitoral é inferido.

## Estrutura editorial
Capa; resumo executivo; metodologia; desempenho; crescimento da base; perfis da chapa e independentes; conteúdos em destaque; temas; formatos; dias e horários; radar comparativo quando solicitado; síntese; limitações; encerramento Data Sight.

Comparações mantêm as posições Candidato/Vice/Associado e permitem trocar a métrica. Pizza só é disponibilizada para composição de contagens observadas não negativas, com poucos itens e total positivo. Não é usada para médias, taxas, seguidores sobrepostos ou séries temporais. Crescimento negativo não recebe escala de raiz quadrada.

## Validação
- Backend: `python -m unittest discover -s tests -v` — **143 testes passaram**, incluindo 15 novos para relatórios.
- Frontend: **12 testes JavaScript passaram**, cobrindo calendário, escopo e métricas/agregação existentes.
- Build: passou; aviso de bundle acima de 500 kB.
- Lint: sem erros; avisos anteriores de Fast Refresh.
- Navegador: geração de relatório de uma chapa e de comparação com dados reais; métricas e crescimento manual exatos; troca de métricas; pizza permitida/proibida; reabertura e alteração de filtros; botão de exportação; desktop, tablet e 390 px; sem erros de execução ou falhas da API nos testes específicos.
- Casos visuais: imagem real em cache com decodificação confirmada; capa tipográfica sem imagens; relatório sem dados em 2020; dados insuficientes e métricas ausentes.
- PDF A4 gerado e páginas renderizadas para inspeção. Foram corrigidos redução indevida da página, largura zero no contêiner interno do Recharts, ícones de legenda ampliados e quebras que isolavam títulos/pequenos trechos. A verificação mede as dimensões reais dos SVGs principais para impedir gráficos invisíveis. Cabeçalho/rodapé e numeração presentes, menus ausentes e imagem real incorporada.
- Regressão visual existente de chapas: passou, incluindo análises individuais, outlier, tooltips, associação/desvinculação e todas as rotas em 390 px. O teste respeita a janela real do limitador de requisições.
- Hashes SHA-256 idênticos antes/depois: 1943 posts, 3617 snapshots de posts, 216 snapshots de perfis, 1655 amostras de comentários, 16 coletas e 146 execuções por perfil. Somente documentos novos foram acrescentados a generated_reports.

Nenhum commit ou push. Vercel, infraestrutura e produção não foram alterados.


## Exportação direta (ajuste local de outubro de 2026)

A capa é tipográfica, sem imagem. As fotografias de conteúdos permanecem na seção de destaques. O menu **Exportar relatório** oferece **Baixar HTML** e **Baixar PDF**, com carregamento, confirmação discreta e erro recuperável. **Alterar filtros** conserva a rota anterior.

`reportExport.ts` clona somente `.report-paper` após aguardar os recursos e estabilizar os gráficos. Incorpora as quatro fontes locais DM Sans, o CSS do relatório, os SVGs com apresentação e geometria preservadas, imagens disponíveis em data URLs e canvas em PNG. Preserva as seleções atuais de métrica, escala e tipo de gráfico. Remove controles, scripts, eventos e dependências da aplicação. O HTML estático abre offline, inclusive fora do aplicativo; links de publicações continuam sendo links externos opcionais. Uma imagem inacessível recebe uma indicação de indisponibilidade; nenhuma outra imagem é criada ou buscada por scraping.

O PDF recebe exatamente esse HTML em `POST /api/digital-reports/{id}/export/pdf`; a rota verifica o relatório salvo e usa as mesmas regras de autenticação, autorização e limites de requisições da API. Não consulta métricas nem altera filtros, documentos ou banco. Apenas essa rota admite até 16 MiB, por conter fontes/imagens incorporadas; o limite comum de 64 KiB permanece nas demais rotas. Também há verificação durante a leitura do corpo, até para requisições sem Content-Length.

O renderizador `report_pdf.py` executa `report_pdf.mjs` com Node/Playwright/Chromium, sem interface. Usa A4, CSS paginado existente, fundos escuros, cabeçalho, rodapé e numeração. SVGs permanecem vetoriais. Não há `window.print()`, diálogo nem navegação para a aplicação. O processo não recebe credenciais. JavaScript do documento está desabilitado, todas as requisições externas são bloqueadas, service workers são bloqueados e uma CSP restritiva imposta antes do documento só permite imagens/fontes inline. Limites: duas gerações simultâneas e 65 segundos por processo. Erros não expõem HTML nem diagnóstico privado do processo.

Pré-requisitos locais: Node disponível para o processo do backend, dependências npm instaladas na raiz (incluindo o Playwright já usado pelos testes), e Chromium instalado para esse mesmo usuário (`npx playwright install chromium`, quando necessário). Não foi alterada configuração de produção, Vercel ou infraestrutura. Em outro servidor esses pré-requisitos precisam ser provisionados antes de habilitar a exportação; ausência produz erro discreto, sem recorrer à impressão manual.

Validação: `npm run build`; suíte completa do backend; `node --test tests/daily-analytics.test.mjs tests/slate-metrics.test.mjs tests/analysis-period.test.mjs`; `node tests/report-exports-ui.mjs` (relatórios salvos 7 e 8 locais); `node tests/digital-reports-ui.mjs` (integração do gerador, cria apenas novos documentos de relatório). O teste de exportação cobre HTML aberto sem rede, fontes incorporadas, dimensões de SVG, comparação em pizza selecionada, imagem real já armazenada, downloads de PDF, erro/repetição, ausência de impressão e interface em 390 px.


## Guia de indicadores e leitura executiva — 23/10/2026

O relatório inclui **Como interpretar os indicadores**: sete blocos editoriais para seguidores, crescimento, amostra de publicações, interações armazenadas, média por post com métrica, comentários e plays/views. As fórmulas e restrições ficam explícitas, sem modificar metodologia, limitações ou indicadores existentes. A metodologia usa duas colunas no PDF para evitar a página de continuação quase vazia; o guia e a leitura executiva aparecem antes dos gráficos, com índice e numeração coerentes.

**O que os dados mostram** tem sete cartões fixos: formato, desempenho por perfil, crescimento da base, conteúdos de destaque, dia da publicação, horário e picos de desempenho. Cada cartão contém dado observado, interpretação e leitura prática. Ausência de evidência gera indicação de insuficiência, e não uma conclusão inventada. Formatos/dias/faixas líderes são identificados dinamicamente, inclusive empates e zeros observados. Não há nomes de vencedores fixados no código. Não há insights executivos de Temas; os gráficos de Temas permanecem.

`report_interpretation.py` é uma função pura sobre a análise congelada. Usa médias já calculadas sobre os posts e a cobertura existente, nunca média das médias dos perfis. A comparação individual mostra todos os perfis do recorte, distinguindo seguidores, posts, total e média de interações. Crescimento absoluto e percentual recebem lideranças separadas; valores negativos indicam redução. O destaque usa o post real da própria análise, e picos contextualizam sua participação no total e sua relação com a média (somente com denominador positivo). Não se presume concentração elevada nem um caso excepcional quando os valores não demonstram isso; os destaques não são apresentados como distribuição completa.

Novos relatórios salvam `editorial_version: 2`. Para documentos antigos, a leitura é montada somente a partir do JSON já salvo, na resposta de leitura: não há reconsulta de métricas, regravação do documento, alteração de datas, histórico ou filtros. O teste de compatibilidade verifica que o conteúdo serializado no banco permanece idêntico. HTML/PDF exportam os mesmos cartões e guia que estão na tela, pelo mecanismo de exportação existente.

Arquivos desta rodada:
- `backend/app/services/report_interpretation.py`
- `backend/app/services/digital_reports.py`
- `src/components/reports/ReportIndicatorGuide.tsx`
- `src/pages/DigitalReport.tsx`
- `src/types/digitalReport.ts`
- `src/styles/digital-report.css`
- `backend/tests/test_digital_reports.py`
- `tests/digital-reports-ui.mjs`
- `tests/report-exports-ui.mjs`
- este documento.

Validação: 150 testes do backend, incluindo médias ponderadas por posts com métrica, compatibilidade de documentos, empates, zeros, ausência de dados, destaque real e proporção de interações. Os testes de navegador existentes agora também verificam sete blocos do guia, sete insights e a presença da nova leitura no HTML autônomo. Sem alterações em coleta, autenticação, chapas, perfis, históricos, infraestrutura ou produção.

Resultado final desta rodada: build aprovado; 150 testes do backend e 12 testes de métricas aprovados; suítes de geração e exportação aprovadas. PDF simples com 16 páginas e comparativo com 19 páginas inspecionados; guia na página 4 e leitura executiva antes dos gráficos. O exemplo `tmp-data-sight-report.pdf` é uma cópia do download real validado, sem impressão manual.
