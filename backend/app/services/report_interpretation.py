"""Executive reading of frozen report metrics; no IO, source mutations or means of means."""

def fmt(value):
    if value is None:
        return "não disponível"
    return f"{value:,.2f}".rstrip("0").rstrip(".").replace(",", "_").replace(".", ",").replace("_", ".")


def executive_reading(report):
    summary = report['summary']
    profiles = report['profiles']
    cards = []

    def add(ident, title, headline, facts, interpretation, implication, value=None, **extra):
        cards.append(dict(id=ident, title=title, headline=headline, facts=facts,
                          interpretation=interpretation, implication=implication,
                          text=interpretation, value=value,
                          status='available' if value is not None else 'insufficient', **extra))

    def leaders(rows, metric):
        valid = [row for row in rows if row.get(metric) is not None]
        if not valid:
            return []
        maximum = max(row[metric] for row in valid)
        return [row for row in valid if row[metric] == maximum]

    def names(rows, field):
        return ', '.join(str(row[field]) for row in rows)

    formats = report['formats']
    volume = leaders(formats, 'posts')
    average = leaders(formats, 'avg_observed_interactions')
    same = bool(volume and average and {r['format'] for r in volume} == {r['format'] for r in average})
    facts = ([f"Maior volume: {names(volume, 'format')} · {fmt(volume[0]['posts'])} publicações por formato."] if volume else [])
    if average:
        facts.append(f"Maior média: {names(average, 'format')} · {fmt(average[0]['avg_observed_interactions'])} interações por publicação com métrica.")
        facts.extend(f"{r['format']}: {r['posts']} posts, {fmt(r.get('coverage',{}).get('observed_interactions'))} com interações disponíveis." for r in average)
    facts.extend(f"{r['format']}: {fmt(r['posts'])} publicações / média de {fmt(r.get('avg_observed_interactions'))} interações por publicação." for r in formats)
    add('format', 'Formato', names(average, 'format') if average else 'Média não disponível', facts,
        (f"Na amostra observada, {names(average, 'format')} combina maior volume de publicação com a maior média de interações por publicação." if same else
         'Volume publicado e desempenho médio têm lideranças diferentes na amostra observada.' if volume and average else
         'A cobertura disponível não permite comparar volume e média por formato.') + (' Há empate na liderança de volume ou média.' if len(volume)>1 or len(average)>1 else ''),
        'Os formatos com maior média são prioritários para testes e monitoramento com amostras comparáveis, mas a associação observada não permite atribuir o desempenho ao formato isoladamente.',
        average[0]['avg_observed_interactions'] if average else None)

    facts = [f"@{p['username']} · {fmt(p.get('followers'))} seguidores · {p['posts']} posts · {fmt(p.get('observed_interactions'))} interações · média {fmt(p.get('avg_observed_interactions'))} ({fmt(p.get('coverage',{}).get('observed_interactions'))} posts com métrica)." for p in profiles]
    differences = any(len({p[m] for p in profiles if p.get(m) is not None})>1 for m in ['followers','observed_interactions','avg_observed_interactions'])
    follower_leads = leaders(profiles,'followers'); total_leads = leaders(profiles,'observed_interactions'); mean_leads = leaders(profiles,'avg_observed_interactions')
    lead_facts = [f"{label}: {', '.join('@'+p['username'] for p in rows)}." for label,rows in [('Maior audiência',follower_leads),('Maior volume de interações',total_leads),('Maior média por post',mean_leads)] if rows]
    add('profile', 'Desempenho por perfil', f"{len(profiles)} perfis observados", facts+lead_facts,
        ' '.join(f"{names(rows,'username')} apresenta {label} na amostra observada." for label,rows in [('a maior audiência individual',follower_leads),('o maior volume absoluto de interações',total_leads),('a maior média por publicação',mean_leads)] if rows) if differences else
        'Os indicadores disponíveis não demonstram diferenças entre perfis.' if len(profiles)>1 else 'Um único perfil não permite comparação entre integrantes.',
        'Para comparação estratégica, observe os três indicadores em conjunto: audiência mede dimensão da base; interações mostram volume de resposta observado; média por publicação ajuda a comparar intensidade de desempenho dos conteúdos. Considere cobertura e tamanho da amostra; esses indicadores não medem apoio eleitoral.',
        summary.get('avg_observed_interactions') if len(profiles)>1 else None)

    absolute = leaders(profiles,'growth_absolute'); relative = leaders(profiles,'growth_percent')
    facts = [f"@{p['username']} · variação absoluta {fmt(p.get('growth_absolute'))} · variação percentual {fmt(p.get('growth_percent'))}% · {fmt(p.get('days_with_data'))} dias com dados.".replace('não disponível%', 'não disponível') for p in profiles]
    if summary.get('growth_absolute') is not None:
        facts.insert(0,f"Base agregada comparável: {fmt(summary['growth_absolute'])} seguidores · {fmt(summary.get('growth_percent'))}%.".replace("não disponível%", "não disponível"))
    if absolute: facts.append('Maior variação absoluta: '+', '.join('@'+p['username'] for p in absolute)+'.')
    if relative: facts.append('Maior variação percentual: '+', '.join('@'+p['username'] for p in relative)+'.')
    add('growth', 'Crescimento da base', 'Variação absoluta e relativa', facts,
        (' '.join(f"{names(rows,'username')} apresentou a maior variação {label}: {fmt(rows[0][metric])}{suffix}." for label,metric,suffix,rows in [('absoluta','growth_absolute',' seguidores',absolute),('percentual','growth_percent','%',relative)] if rows)+' As lideranças podem diferir; valores negativos indicam redução.') if absolute else
        'Faltam duas observações comparáveis para medir a evolução; uma única observação não permite calcular crescimento.',
        'Analise crescimento absoluto e percentual conjuntamente: perfis menores podem apresentar taxas maiores, enquanto bases maiores podem gerar acréscimos absolutos relevantes. Compare datas e cobertura; a soma agregada usa datas completas comuns, sem interpolação e sem deduplicar pessoas.',
        summary.get('growth_absolute') if summary.get('growth_absolute') is not None else absolute[0]['growth_absolute'] if absolute else None)

    top = report.get('insights',{}).get('top_posts',{}).get('observed_interactions')
    value = top['metrics'].get('observed_interactions') if top else None
    mean = summary.get('avg_observed_interactions')
    ratio = value / mean if value is not None and mean is not None and mean>0 else None
    total = summary.get('observed_interactions')
    share = value/total*100 if value is not None and total is not None and total>0 else None
    top_facts = [f"Publicação {top['post_id']} · @{top['profile']['username']} · {fmt(value)} interações observadas."] if top else []
    if mean is not None: top_facts.append(f"Média da amostra: {fmt(mean)} por publicação com interações disponíveis.")
    if ratio is not None: top_facts.append(f"Maior publicação / média da amostra: {fmt(ratio)} vezes.")
    if share is not None: top_facts.append(f"{fmt(value)} de {fmt(total)} interações da amostra: {fmt(share)}% do total.")
    add('content', 'Conteúdos de destaque', 'Uma publicação em contexto' if top else 'Conteúdo não disponível', top_facts,
        f"Um único conteúdo concentrou {fmt(share)}% das interações observadas na amostra. Conteúdos fora da curva podem influenciar significativamente os indicadores agregados; este post não representa todos os conteúdos." if share is not None and ratio is not None and ratio>1 else
        'O maior valor observado não demonstra, por si só, um conteúdo excepcional frente à média disponível.' if top else
        'Não há publicação com interações disponíveis para contextualizar um destaque.',
        'Analise a média geral junto da distribuição dos conteúdos e dos casos de maior desempenho; não transforme um caso em regra geral.',
        value, **({'post_id':top['post_id']} if top else {}))

    for ident, title, group, key in [('weekday','Dia da publicação','weekdays','weekday'),('hour','Horário','hours','hour')]:
        rows = leaders(report[group], 'avg_observed_interactions')
        def label(row):
            n=row[key]
            return ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'][n] if key=='weekday' else f"{n}h–{(n+3)%24}h"
        labels=', '.join(label(r) for r in rows)
        facts=[f"{label(r)} · média {fmt(r['avg_observed_interactions'])} · {r['posts']} publicações, {fmt(r.get('coverage',{}).get('observed_interactions'))} com métrica." for r in rows]
        add(ident,title,labels if rows else 'Comparação não disponível',facts,
            f"{labels} apresentou a maior média de interações observada na amostra." + (' Há empate.' if len(rows)>1 else '') if rows else
            'A amostra não dispõe de interações para identificar uma faixa com maior média.',
            'Este é um sinal descritivo para testes futuros com amostras comparáveis. Não permite concluir que o dia, isoladamente, cause maior desempenho.' if key=='weekday' else
            'Use o resultado como hipótese para testes futuros; não estabelece causalidade entre horário e desempenho. Faixas em America/Sao_Paulo.',
            rows[0]['avg_observed_interactions'] if rows else None)

    total = summary.get('observed_interactions')
    share = value/total*100 if value is not None and total is not None and total>0 else None
    facts = ([f"Uma publicação reúne {fmt(share)}% das interações disponíveis da amostra.", f"{fmt(value)} de {fmt(total)} interações observadas."] if share is not None else [])
    if ratio is not None: facts.append(f"Esse conteúdo equivale a {fmt(ratio)} vezes a média dos posts com métrica.")
    add('peaks','Concentração do desempenho','Concentração das interações',facts,
        'A participação do maior conteúdo evidencia a concentração das interações. Quando se destaca frente à média, um conteúdo excepcional pode influenciar o desempenho agregado, sem representar um padrão uniforme entre as publicações.' if share is not None else
        'Sem total positivo de interações não é possível calcular a participação do maior conteúdo; zero observado não é ausência de dado.',
        'Analise tanto médias quanto conteúdos individuais antes de concluir sobre desempenho. Os destaques não são uma distribuição completa e não permitem generalizar resultados futuros.',
        share, **({'post_id':top['post_id']} if top else {}))
    return cards
