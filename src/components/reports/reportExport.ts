import reportCss from '@/styles/digital-report.css?inline'
import type {DigitalReport} from '@/types/digitalReport'
import {apiAsset} from '@/services/radarApi'
import {authHeaders} from '@/services/authHeaders'

const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export function reportFilename(report:DigitalReport){
 const title=report.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)||'documento'
 return `data-sight-relatorio-${title}-${report.filters.start_date}-${report.filters.end_date}`
}
async function asDataUrl(blob:Blob):Promise<string>{return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Não foi possível incorporar um recurso do relatório.'));reader.readAsDataURL(blob)})}
async function resource(url:string){const response=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Recurso do relatório indisponível.');return asDataUrl(await response.blob())}
/** Snapshot of this rendered document; no analytics request or recalculation. */
export async function standaloneReport(report:DigitalReport){
 document.documentElement.classList.add('report-exporting')
 try{
  await document.fonts.ready
  const deadline=Date.now()+6000
  while(document.querySelector('[data-report-image-pending]')&&Date.now()<deadline)await pause(50)
  await Promise.race([Promise.all([...document.querySelectorAll<HTMLImageElement>('.report-paper img')].map(img=>img.decode().catch(()=>{}))),pause(8000)])
  await pause(250);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
  const source=document.querySelector<HTMLElement>('.report-paper');if(!source)throw new Error('Relatório não disponível.')
  const clone=source.cloneNode(true) as HTMLElement
  // Retain SVG geometry and computed presentation, including the selected chart type/metric.
  const liveSvgs=source.querySelectorAll<SVGElement>('svg'),copiedSvgs=clone.querySelectorAll<SVGElement>('svg')
  liveSvgs.forEach((svg,i)=>{
   const copy=copiedSvgs[i],style=getComputedStyle(svg)
   for(const key of ['fill','stroke','stroke-width','font-family','font-size','font-weight','color','text-anchor','dominant-baseline'])copy.style.setProperty(key,style.getPropertyValue(key))
   if(svg.classList.contains('recharts-surface')&&svg.parentElement?.classList.contains('recharts-wrapper')){
    const box=svg.getBoundingClientRect();copy.setAttribute('viewBox',`0 0 ${svg.getAttribute('width')||box.width} ${svg.getAttribute('height')||box.height}`);copy.setAttribute('width','100%');copy.setAttribute('height','100%')
   }
  })
  // SVG descendants also depend on the app's inherited typography.
  const copiedSvgChildren=clone.querySelectorAll<SVGElement>('svg *')
  source.querySelectorAll<SVGElement>('svg *').forEach((node,i)=>{const target=copiedSvgChildren[i],style=getComputedStyle(node);for(const key of ['fill','stroke','stroke-width','font-family','font-size','font-weight','color'])target.style.setProperty(key,style.getPropertyValue(key))})
  clone.querySelectorAll<HTMLElement>('.recharts-responsive-container').forEach(container=>{
   const wrapper=container.querySelector<HTMLElement>('.recharts-wrapper');if(wrapper){wrapper.style.width='100%';wrapper.style.height='100%';wrapper.querySelectorAll<HTMLElement>('.recharts-legend-wrapper').forEach(legend=>{legend.style.width='100%';legend.style.left='0'});container.replaceWith(wrapper)}
  })
  const images=[...clone.querySelectorAll('img')],originalImages=[...source.querySelectorAll('img')]
  await Promise.all(images.map(async(img,i)=>{
   try{if(!originalImages[i].naturalWidth)throw new Error('missing');img.src=await resource(originalImages[i].currentSrc||originalImages[i].src);img.removeAttribute('srcset');img.loading='eager'}
   catch{const note=document.createElement('p');note.className='report-image-empty';note.textContent='Imagem não disponível para esta exportação.';img.replaceWith(note)}
  }))
  const originalCanvas=source.querySelectorAll('canvas');clone.querySelectorAll('canvas').forEach((canvas,i)=>{const img=document.createElement('img');img.src=originalCanvas[i].toDataURL('image/png');img.style.cssText=canvas.style.cssText;img.width=canvas.width;img.height=canvas.height;canvas.replaceWith(img)})
  clone.querySelectorAll('.no-print,.recharts-tooltip-wrapper,[data-report-image-pending],script,iframe,object,embed,form').forEach(node=>node.remove())
  clone.querySelectorAll('*').forEach(node=>{for(const attr of [...node.attributes])if(attr.name.startsWith('on'))node.removeAttribute(attr.name)})
  const fonts=await Promise.all([['Regular',400],['Medium',500],['SemiBold',600],['Bold',700]].map(async([name,weight])=>`@font-face{font-family:"DM Sans";font-weight:${weight};src:url("${await resource(`/fonts/dm-sans/DMSans-${name}.ttf`)}") format("truetype")}`))
  const reset='*,:before,:after{box-sizing:border-box}html,body{margin:0;padding:0;background:#080808;color:#eee}h1,h2,h3,p,figure,dl,dd,ol,ul{margin:0}button,input,select{font:inherit}img,svg,canvas{vertical-align:middle}img{max-width:100%}a{color:inherit}body{font-family:"DM Sans",sans-serif}.report-paper{margin:auto;width:100%}.report-shell{display:block;max-width:1160px}.recharts-wrapper{position:relative}.recharts-legend-wrapper{position:absolute}.recharts-default-legend{list-style:none;padding:0;text-align:center}.recharts-legend-item{display:inline-block;margin-right:10px}.recharts-surface{overflow:visible}'
  const csp="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>${escape('Data Sight – '+report.title)}</title><style>${fonts.join('')}${reset}${reportCss}.report-shell{display:block;max-width:1160px}.report-paper{margin:auto}</style></head><body><div class="digital-report"><div class="report-shell">${clone.outerHTML}</div></div></body></html>`
 }finally{document.documentElement.classList.remove('report-exporting')}
}
export async function pdfReport(report:DigitalReport,html:string){
 const endpoint=apiAsset(`/digital-reports/${report.id}/export/pdf`)
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/html; charset=utf-8',...await authHeaders(new URL(endpoint,location.origin).origin)},body:html,signal:AbortSignal.timeout(90000)})
 if(!response.ok){const error=await response.json().catch(()=>null);throw new Error(typeof error?.detail==='string'?error.detail:'Não foi possível gerar o PDF. Tente novamente.')}
 return response.blob()
}
export function downloadReport(blob:Blob,filename:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
