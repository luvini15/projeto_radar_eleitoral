# Cadastro Planaltina e auditoria territorial

Branch `feature/territorial-post-detection`. Nenhum commit; main preservada. Esta etapa reutiliza o banco e a classificação existente, sem executar Apify.

## Cadastro real

**4 novos, 0 preexistentes.** Segunda execução: 0 novos, 4 existentes; sem novos vínculos duplicados.

| Perfil | ID | RA | Papel | Ativo | Posts locais |
|---|---:|---|---|---|---:|
| @deolhoemplanaltina | 44 | Planaltina | LOCAL_PAGE | Sim | 0 |
| @planaltinanews | 45 | Planaltina | LOCAL_PAGE | Sim | 0 |
| @jornalplanaltinaa | 46 | Planaltina | LOCAL_PAGE | Sim | 0 |
| @fala_planaltina | 47 | Planaltina | LOCAL_PAGE | Sim | 0 |

Para cada um dos quatro: **Perfil cadastrado, mas ainda sem posts locais no banco.** URLs canônicas armazenadas em `planaltina-profiles.json`. O tipo funcional usa `CampaignProfile.role=LOCAL_PAGE`; o campo legado `profile_type` permanece compatível. A rotina confirma/atualiza RA, papel e atividade de vínculos existentes sem apagar histórico.

Só posts efetivamente armazenados alimentam tendências, temas e interações. A associação a Planaltina não prevalece sobre menção explícita a outra RA. Esse comportamento foi verificado com posts sintéticos no banco de testes, sem criar posts no banco real.

## Auditoria real

| Indicador | Resultado |
|---|---:|
| Posts analisados | 467 |
| Com RA | 137 |
| Sem RA | 330 |
| Posts HIGH | 137 |
| Posts MEDIUM | 0 |
| Posts LOW | 2 |
| Atribuições HIGH | 159 |
| Posts com múltiplas RAs | 18 |
| RAs encontradas | 28 |
| Linhas de auditoria | 489 |

O total de posts HIGH é 137; 159 é a quantidade de atribuições HIGH. Os 328 registros `NONE` têm um placeholder LOW no banco, mas não são detecções LOW: a auditoria expõe `confidence=null`, mantém o valor original em `stored_confidence` e não os soma aos dois candidatos LOW. Os 330 sem RA incluem esses 328 e os dois LOW ambíguos.

**Nenhuma classificação foi alterada pela auditoria.** Ela lê `post_regions` diretamente, sem reclassificar nem aplicar fallback dinâmico de perfil. Campos ausentes permanecem nulos; métricas vêm do último snapshot, preservando zero.

Todas as 159 evidências HIGH são trechos literais da legenda ou, quando `detection_source=LOCATION`, da localização armazenada. Essa verificação confirma rastreabilidade textual; não equivale a revisão humana da interpretação territorial de cada HIGH.

## Distribuição por RA

| RA | Posts atribuídos |
|---|---:|
| Arapoanga | 15 |
| Arniqueira | 19 |
| Brazlândia | 5 |
| Ceilândia | 7 |
| Cruzeiro | 1 |
| Fercal | 5 |
| Gama | 2 |
| Guará | 1 |
| Lago Norte | 1 |
| Lago Sul | 2 |
| Núcleo Bandeirante | 1 |
| Paranoá | 1 |
| Planaltina | 65 |
| Plano Piloto | 3 |
| Recanto das Emas | 1 |
| Riacho Fundo | 3 |
| SCIA/Estrutural | 2 |
| SIA | 3 |
| Samambaia | 2 |
| Santa Maria | 3 |
| Sobradinho | 6 |
| Sobradinho II | 1 |
| Sol Nascente/Pôr do Sol | 2 |
| São Sebastião | 1 |
| Taguatinga | 2 |
| Vicente Pires | 1 |
| Água Quente | 1 |
| Águas Claras | 3 |

Um post pode constar em mais de uma RA; somar as linhas não produz o total de posts únicos.

## Distribuição por fonte

| Fonte | Atribuições/candidatos | Posts distintos |
|---|---:|---:|
| EXPLICIT_RA | 110 | 94 |
| LOCATION | 51 | 47 |
| NONE | 328 | 328 |

LOCALITY e PROFILE não aparecem no conjunto persistido atual. Um mesmo post pode ter evidência na legenda e na localização; as contagens por fonte também podem se sobrepor.

## Análise individual dos dois LOW

Ambos mantêm `region_id=NULL`. As explicações são observações da auditoria sobre a regra atual; não são um motivo histórico que já estivesse persistido.

### Post 40 — @claudioborcem_

Publicação: https://www.instagram.com/p/DaVvAAjx455/

Legenda completa:

LANÇAMENTO DA PRÉ-CAMPANHA DA NOSSA GOVERNADORA CELINA LEAO! 🇧🇷

É hora de dar mais um passo por um Distrito Federal cada vez melhor. Venha participar deste grande encontro e demonstrar seu apoio à pré-candidatura da @celinaleao 

📆 04/07
⏰ 09h
📍Local: Santa Maria - Quadradão Cultural, ao lado da
Administração Regional.

Contamos com a sua presença, aguardo você!

Evidência armazenada: “📍Local: Santa Maria”

RA atribuída: **NULL**. Confiança: **LOW**.

Motivo: Nome potencialmente homônimo. O prefixo Local: não integra os contextos geográficos aceitos pela regra atual; a RA permaneceu nula.

Leitura da auditoria: a legenda fala em Distrito Federal e usa “Local: Santa Maria”, seguido de Quadradão Cultural e Administração Regional. Há contexto que merece revisão humana; a expressão “Local:” ficou fora dos prefixos reconhecidos pelo detector. Não foi feita correção automática.

### Post 195 — @deputadoroberio

Publicação: https://www.instagram.com/p/DcwIwxWEdfb/

Legenda completa:

🥳🎉 Parabéns, #JardimBotânico, pelos 22 anos como Região Administrativa do DF! 

Ao longo dos último anos, o nosso mandato ouviu os moradores e buscou soluções para levar melhorias à região, cobrando avanços em mobilidade, infraestrutura, saúde, segurança no trânsito e iluminação. 

Seguimos juntos, ouvindo a população e buscando melhorias para o Jardim Botânico! 🤝

#RobérioNegreiros #DeputadoDistrital #MandatoParticipativo #NossaUniãoNossaForça AgoraÉ2️⃣0️⃣0️⃣0️⃣0️⃣

Evidência armazenada: “indo a população e buscando melhorias para o Jardim Botânico”

RA atribuída: **NULL**. Confiança: **LOW**.

Motivo: Nome potencialmente homônimo sem prefixo geográfico aceito pela regra. A hashtag compacta #JardimBotânico não é um alias cadastrado; a RA permaneceu nula.

Leitura da auditoria: a legenda afirma “#JardimBotânico, pelos 22 anos como Região Administrativa do DF” e depois menciona “para o Jardim Botânico”. A hashtag compacta e o prefixo “para o” não são contemplados pela regra. É um candidato a revisão por limitação do detector, mantido sem RA nesta etapa.

## Como visualizar

Abra **audit.html** neste diretório. O relatório funciona localmente, sem buscar dados externos, e permite filtrar confiança, RA, perfil, tema, datas e múltiplas RAs. Cada cartão mostra **legenda → evidência → RA**, a localização quando houver e todas as associações do post, mesmo quando uma delas foi usada no filtro. LOW traz motivo; sem RA exibe “Sem evidência territorial suficiente”.

Arquivos de dados: `posts.json` (todas as linhas), `low.json` (dois LOW), `multiple-regions.json` (todas as evidências dos 18 posts multirregião), `summary.json` e `planaltina-profiles.json`.

## Endpoints disponíveis

- `GET /api/territorial/audit`: dados paginados, `items`, `total` de linhas e resumo.
- `GET /api/territorial/audit/summary`: resumo com os mesmos filtros.

Filtros: `region_id`, `confidence=HIGH|MEDIUM|LOW`, `profile_id`, `theme`, `start_date`, `end_date`, `has_region=true|false`, `multiple_regions=true|false` e `campaign_id` opcional. Datas correspondem a dias UTC e incluem o dia final. Paginação: `offset`, `limit` (padrão 50, máximo 500). Ordenação: HIGH, MEDIUM, LOW, sem classificação; depois publicação decrescente e desempate estável.

O escopo padrão é o banco inteiro, necessário para auditar os 467 posts, inclusive coautores sem vínculo ativo com a campanha. `campaign_id` restringe aos perfis vinculados, incluindo inativos para auditoria histórica. Nenhum filtro muda decisões.

Exemplos:

```text
/api/territorial/audit?confidence=HIGH&limit=500
/api/territorial/audit?confidence=LOW
/api/territorial/audit?multiple_regions=true
/api/territorial/audit?region_id=6
/api/territorial/audit?has_region=false
/api/territorial/audit?profile_id=44
```

Campos: post_id, shortcode, profile_id, username, caption, published_at, url, region_id, region_name, detection_source, confidence, evidence, theme, interactions, likes, comments, views e plays. Acrescentados location_name, snapshot_at, region_count, territories, stored_confidence, status_message, low_confidence_reason, reason_origin e evidence_is_literal para rastreabilidade.

## Rotina local

No PowerShell, com DATABASE_URL configurada apenas no ambiente/local e PYTHONPATH=backend:

```powershell
$env:PYTHONPATH='backend'
backend/.venv/Scripts/python.exe -m app.territorial_audit_cli --output-dir reports/territorial-audit
```

Sem flags adicionais, a rotina apenas consulta e exporta. Para repetir explicitamente o cadastro autorizado dos quatro perfis na campanha 1, acrescente `--register-planaltina 1`. Só posts locais desses quatro perfis são processados nessa opção; a classificação global permanece intacta.

## Validação e integridade

- 71 testes backend aprovados (56 existentes + 15 novos).
- Build frontend aprovado; aviso já existente de bundle de 779,30 kB.
- Lint: zero erros, seis avisos existentes de Fast Refresh.
- Relatório HTML validado no navegador: HIGH, LOW, múltiplas RAs, sem RA, Planaltina e mobile, com requisições externas bloqueadas.
- Endpoints e OpenAPI conferidos no container atualizado.
- SHA-256 antes/depois confirmou que posts, post_regions, post_themes, snapshots de posts e seguidores e registros de coleta não mudaram. Banco segue com 467 posts, 1.765 snapshots de posts, 68 de seguidores e 12 execuções de coleta.
- Perfis passaram de 43 para 47; foram criados quatro vínculos de campanha. Nenhuma nova migração foi necessária.
- Scheduler foi suspenso e permanece parado para impedir coleta durante a auditoria. API e PostgreSQL continuam funcionando. Um worker órfão da API antiga foi encerrado para que localhost e 127.0.0.1 usem a API atualizada do Docker.
- Nenhuma chamada Apify nesta etapa. Nenhum commit ou mudança em main.

## Arquivos desta etapa

Modificados:

- `README.md`
- `backend/app/main.py`
- `backend/app/services/profile_import.py`
- `backend/tests/test_auto_sync.py`
- `backend/tests/test_merge_integration.py`

Criados:

- `backend/app/routers/territorial_audit.py`
- `backend/app/services/territorial_audit.py`
- `backend/app/territorial_audit_cli.py`
- `backend/app/templates/territorial_audit.html`
- `backend/tests/test_territorial_audit.py`
- `tests/territorial-audit-report-smoke.mjs`
- `reports/territorial-audit/` — dados, relatório visual, relatório textual e verificações.

As demais alterações já existentes na branch, provenientes da etapa anterior, foram preservadas.
