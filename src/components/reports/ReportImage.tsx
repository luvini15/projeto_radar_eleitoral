import * as React from 'react'
import {apiAssetBlob} from '@/services/radarApi'
export function ReportImage({reportId,postId,image,alt,cover=false,onUnavailable}:{reportId:number;postId:number;image:{cached:boolean;url:string|null};alt:string;cover?:boolean;onUnavailable?:()=>void}){
 const [src,setSrc]=React.useState<string|null>(image.cached?null:image.url),[failed,setFailed]=React.useState(false)
 React.useEffect(()=>{let cancelled=false,url:string|undefined;if(!image.cached){setSrc(image.url);return}apiAssetBlob(`/digital-reports/${reportId}/images/${postId}`).then(blob=>{if(cancelled)return;url=URL.createObjectURL(blob);setSrc(url)}).catch(()=>{if(!cancelled){setSrc(image.url);if(!image.url){setFailed(true);onUnavailable?.()}}});return()=>{cancelled=true;if(url)URL.revokeObjectURL(url)}},[reportId,postId,image.cached,image.url,onUnavailable])
 if(failed||!image.cached&&!image.url)return cover?null:<p className="report-image-empty">Imagem não disponível. Os dados da publicação permanecem disponíveis.</p>
 if(!src)return <div data-report-image-pending className="report-image-empty" role="status">Carregando imagem armazenada…</div>
 return <img className={cover?'report-cover-image':'report-post-image'} src={src} alt={alt} onError={()=>{if(src!==image.url&&image.url)setSrc(image.url);else{setFailed(true);onUnavailable?.()}}} referrerPolicy="no-referrer"/>
}
