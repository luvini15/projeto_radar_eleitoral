"""Manual Meta context, separate from collection. Reads local configuration only."""
import json
import logging
import math
import os
from pathlib import Path

NOTICE = ("O investimento informado pela Meta possui uma janela temporal própria (últimos 90 dias), enquanto as métricas do Data Sight refletem o período e a amostra selecionados. "
          "As relações são contextuais: não representam atribuição direta de mídia, custo de aquisição, ROI, ROAS ou causalidade. "
          "Os valores abrangem anúncios na Meta, não exclusivamente Instagram; não há separação entre interações pagas e orgânicas. "
          "A data da consulta à Meta não foi informada; não se presume alinhamento entre as janelas.")

def local_records():
    path=Path(os.getenv('META_MEDIA_INVESTMENT_FILE',str(Path(__file__).resolve().parents[2]/'data'/'meta_media_investment.local.json')))
    if not path.exists():return []
    try:
        records=json.loads(path.read_text(encoding='utf-8'))['records']
        seen=set()
        for r in records:
            key=(r['campaign_id'],r['slate_id'])
            if key in seen or any(type(r[k]) is not int or r[k]<=0 for k in ['campaign_id','slate_id']):raise ValueError('Invalid scope')
            if type(r['amount']) not in (int,float) or not math.isfinite(r['amount']) or r['amount']<0:raise ValueError('Invalid amount')
            if r['currency']!='BRL' or r['window_days']!=90:raise ValueError('Invalid units')
            if not r.get('profile_ids') or any(type(i) is not int or i<=0 for i in r['profile_ids']):raise ValueError('Invalid members')
            seen.add(key)
        return records
    except (OSError,ValueError,KeyError,TypeError):
        logging.getLogger(__name__).warning('Manual Meta investment configuration unavailable or invalid')
        return []

def contextual_ratios(amount,interactions,growth):
    def valid(n):return type(n) in (int,float) and math.isfinite(n)
    budget=valid(amount) and amount>=0
    observed=valid(interactions) and interactions>0
    increased=valid(growth) and growth>0
    return {
        'spend_per_observed_interaction':amount/interactions if budget and observed else None,
        'interactions_per_1000_brl':interactions/amount*1000 if budget and amount>0 and observed else None,
        'spend_per_additional_follower':amount/growth if budget and increased else None,
    }

def media_context(slates,profiles,posts,period,summarize,aggregate,growth_metrics,records=None):
    records=local_records() if records is None else records
    selected={p['id'] for p in profiles}
    rows=[]
    for slate in slates:
        members={m['profile_id'] for m in slate['members']}
        if not members.intersection(selected):continue
        record=next((r for r in records if r['campaign_id']==slate['campaign_id'] and r['slate_id']==slate['id'] and set(r['profile_ids'])==members),None)
        complete=bool(members) and members.issubset(selected)
        base=summarize([p for p in posts if p['profile']['id'] in members]) if complete else {}
        history=aggregate([{'history':p.get('follower_history',[])} for p in profiles if p['id'] in members]) if complete else []
        evolution=growth_metrics(history) if complete else {}
        amount=record['amount'] if record else None
        interactions=base.get('observed_interactions');growth=evolution.get('growth_absolute')
        rows.append({'campaign_id':slate['campaign_id'],'slate_id':slate['id'],'slate_name':slate['name'],
            'amount':amount,'currency':'BRL','source':record.get('source') if record else None,
            'window_days':record['window_days'] if record else None,'window_label':record.get('window_label') if record else None,
            'observed_at':record.get('observed_at') if record else None,'registration':'manual' if record else None,
            'analysis_period':period,'posts':base.get('posts'),'interactions':interactions,
            'growth_absolute':growth,'growth_percent':evolution.get('growth_percent'),
            'eligible':complete,'unavailable_reason':None if complete else 'Recorte parcial: o investimento da chapa não é atribuído a um perfil isolado.',
            **contextual_ratios(amount,interactions,growth)})
    return {'rows':rows,'notice':NOTICE}
