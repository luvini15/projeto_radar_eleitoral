import type {DigitalReport} from '../types/digitalReport'
type Insight=DigitalReport['editorial_insights'][number]
type Row={username?:string;format?:string}
const valid=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)
function leaders<T extends Row>(rows:T[],metric:keyof T){const known=rows.filter(r=>valid(r[metric]));if(!known.length)return [];const max=Math.max(...known.map(r=>r[metric] as number));return known.filter(r=>r[metric]===max)}
const names=(rows:Row[],field:'username'|'format')=>rows.slice(0,3).map(r=>field==='username'?'@'+r[field]:(r[field]??'Formato não informado')).join(', ')+(rows.length>3?` e outros ${rows.length-3} ${field==='username'?'perfis':'formatos'}`:'')
const same=(a:Row[],b:Row[],field:'username'|'format')=>a.length>0&&a.length===b.length&&a.every(r=>b.some(s=>s[field]===r[field]))
/** Editorial comparisons of saved values only. Never updates or recalculates metrics. */
export function reportReading(report:DigitalReport):Insight[]{
 const a=report.analysis,profiles=a.profiles
 return report.editorial_insights.map(item=>{
  let headline=item.headline,interpretation=item.interpretation,implication=item.implication
  if(item.id==='format'){
   const volume=leaders(a.formats,'posts'),mean=leaders(a.formats,'avg_observed_interactions')
   if(volume.length&&mean.length){
    headline=same(volume,mean,'format')?'Volume e resposta no mesmo formato':'Frequência e resposta em direções distintas'
    interpretation=same(volume,mean,'format')?`${names(mean,'format')} reúne a maior frequência de publicação e a maior média de interações no recorte.`:`${names(volume,'format')} concentra o maior número de publicações. A maior média por post aparece em ${names(mean,'format')}; publicar mais e obter mais resposta por conteúdo são resultados distintos.`
    if(volume.length>1||mean.length>1)interpretation+=' Há empate entre os formatos indicados na liderança.'
    implication=`Acompanhe ${names(mean,'format')} em novos conteúdos, considerando a quantidade de posts disponível. O resultado não isola o efeito do formato: conteúdo, perfil e momento da publicação também variam.`
   }else{headline='Sem base para comparar formatos';interpretation='Faltam métricas disponíveis para comparar frequência e resposta por formato.';implication='Mantenha a comparação em aberto até existir uma amostra com métricas comparáveis.'}
  }
  if(item.id==='profile'){
   if(profiles.length===1){headline='Um perfil, dimensões distintas';interpretation=`A leitura de @${profiles[0].username} reúne tamanho da base, volume de resposta e média por conteúdo. O recorte não contém outro perfil para comparação.`;implication=`Acompanhe @${profiles[0].username} ao longo de novas observações, mantendo o mesmo recorte e a cobertura das métricas. A média por post não é uma taxa por seguidor.`}
   else if(profiles.length>1){
    const audience=leaders(profiles,'followers'),total=leaders(profiles,'observed_interactions'),mean=leaders(profiles,'avg_observed_interactions')
    headline=audience.length&&total.length&&mean.length?(same(audience,total,'username')&&same(total,mean,'username')?'A liderança coincide nas três dimensões':'Audiência e resposta têm lideranças distintas'):'Comparação limitada pela cobertura'
    interpretation=[audience.length?`${names(audience,'username')} tem a maior audiência observada.`:'A audiência não está disponível para comparação.',total.length&&mean.length&&same(total,mean,'username')?`${names(total,'username')} lidera tanto o volume de interações quanto a média por publicação.`:[total.length?`${names(total,'username')} lidera o volume de interações.`:'',mean.length?`${names(mean,'username')} apresenta a maior média por publicação.`:''].filter(Boolean).join(' ')].join(' ')
    if([audience,total,mean].some(rows=>rows.length>1))interpretation+=' As lideranças compartilhadas indicam empate.'
    implication=mean.length?`Compare os conteúdos de ${names(mean,'username')} com os demais perfis antes de atribuir o resultado ao tamanho da base. Considere também o volume publicado e as métricas disponíveis; não se trata de apoio eleitoral.`:'A ausência de médias comparáveis impede apontar um perfil de maior resposta por publicação.'
   }else{headline='Nenhum perfil no recorte';interpretation='A seleção não contém perfis com dados para esta leitura.';implication='Não há base para comparar perfis neste documento.'}
  }
  if(item.id==='growth'){
   const absolute=leaders(profiles,'growth_absolute'),relative=leaders(profiles,'growth_percent')
   const available=profiles.filter(p=>valid(p.growth_absolute))
   if(!available.length){headline='Evolução ainda não mensurável';interpretation='Não há duas observações comparáveis para medir a variação da base neste recorte.';implication='Uma nova observação é necessária antes de interpretar crescimento; lacunas permanecem indisponíveis.'}
   else if(profiles.length===1){const p=profiles[0];headline=(p.growth_absolute??0)>0?'A base aumentou no período':p.growth_absolute===0?'A base permaneceu estável':'A base diminuiu no período';interpretation=`@${p.username} apresentou ${p.growth_absolute===0?'estabilidade':(p.growth_absolute??0)>0?'acréscimo':'redução'} entre as observações comparáveis.${valid(p.growth_percent)?' A taxa percentual deve ser lida em relação à base inicial.':' Não há base válida para apresentar uma taxa percentual.'}`;implication='Compare as próximas observações com o mesmo intervalo, sem interpretar a variação da base como apoio ou intenção de voto.'}
   else{
    const best=absolute[0]?.growth_absolute as number|undefined
    headline=best===0?'A maior variação foi de estabilidade':best!=null&&best<0?'Todas as variações disponíveis foram negativas':!relative.length?'Variação absoluta disponível; taxa indisponível':same(absolute,relative,'username')?'Acréscimo e taxa têm a mesma liderança':'Acréscimo e taxa têm lideranças diferentes'
    interpretation=`${names(absolute,'username')} apresenta a maior variação absoluta entre os valores disponíveis.${relative.length?` ${names(relative,'username')} apresenta a maior variação percentual.`:' Não há taxa percentual comparável.'}`
    if(relative.length===1&&relative[0].growth_percent!>0){const first=(relative[0] as typeof profiles[number]).follower_history.filter(p=>valid(p.followers))[0];const other=profiles.filter(p=>p.username!==relative[0].username).map(p=>p.follower_history.filter(h=>valid(h.followers))[0]?.followers).filter(valid);if(first&&valid(first.followers)&&other.length&&other.every(n=>n>(first.followers as number))&&profiles.every(p=>{const h=p.follower_history.filter(v=>valid(v.followers));const lead=(relative[0] as typeof profiles[number]).follower_history.filter(v=>valid(v.followers));return h[0]?.date===first.date&&h.at(-1)?.date===lead.at(-1)?.date}))interpretation+=' Essa liderança percentual parte de uma base inicial menor que a dos demais perfis com observação disponível.'}
    if(available.length<profiles.length)interpretation+=' A comparação exclui perfis sem observações suficientes.'
    implication=`Leia a taxa de ${relative.length?names(relative,'username'):'cada perfil'} junto do acréscimo absoluto e das datas observadas. Uma taxa maior não representa, por si só, o maior número de novos seguidores.`
   }
  }
  if(item.id==='content'||item.id==='peaks'){
   const top=a.insights.top_posts.observed_interactions,share=report.editorial_insights.find(c=>c.id==='peaks')?.value
   if(top&&valid(share)){
    const owner='@'+top.profile.username
    headline=item.id==='content'?'Um conteúdo com peso no resultado':'Quanto o maior conteúdo pesa no total'
    interpretation=item.id==='content'?`O conteúdo de ${owner} ocupa a maior participação individual nas interações do recorte. O destaque merece leitura própria; não representa automaticamente os demais posts.`:`A participação do maior conteúdo, de ${owner}, mostra quanto do total está concentrado em um único resultado. A média deve ser lida junto dessa concentração.`
    implication=item.id==='content'?`Leia a publicação de ${owner} e compare sua resposta com outros conteúdos do mesmo perfil. Um caso isolado não estabelece um padrão de desempenho.`:'Observe a distribuição dos posts antes de usar a média como referência para o próximo conteúdo. A participação apresentada não é uma medida de resultado típico.'
   }
  }
  if(item.id==='weekday'||item.id==='hour'){
   const key=item.id==='weekday'?'weekdays':'hours',rows=leaders(a[key],'avg_observed_interactions')
   if(rows.length){interpretation=`${item.headline} apresenta a maior média observada ${item.id==='weekday'?'entre os dias da semana':'entre as faixas horárias'}.${rows.length>1?' Há empate entre as faixas apresentadas.':''} O volume de publicações indicado ajuda a dimensionar essa evidência.`;implication=`Use ${item.headline} como referência para acompanhar novos conteúdos em condições comparáveis. ${item.id==='weekday'?'O dia':'O horário'} de publicação não explica o desempenho isoladamente.`}
  }
  return {...item,headline,interpretation,implication,text:interpretation}
 })
}
