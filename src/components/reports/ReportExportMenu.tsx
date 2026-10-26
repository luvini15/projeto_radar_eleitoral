import * as React from 'react'
import {Download,FileCode,FileDown,ChevronDown} from 'lucide-react'
import type {DigitalReport} from '@/types/digitalReport'
import {standaloneReport,pdfReport,reportFilename,downloadReport} from './reportExport'
export function ReportExportMenu({report}:{report:DigitalReport}){
 const [open,setOpen]=React.useState(false),[busy,setBusy]=React.useState(false),[status,setStatus]=React.useState(''),ref=React.useRef<HTMLDivElement>(null),trigger=React.useRef<HTMLButtonElement>(null)
 const menuId=React.useId()
 React.useEffect(()=>{if(!open)return;const close=(event:PointerEvent)=>{if(!ref.current?.contains(event.target as Node))setOpen(false)};document.addEventListener('pointerdown',close);ref.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus();return()=>document.removeEventListener('pointerdown',close)},[open])
 const run=async(format:'html'|'pdf')=>{setOpen(false);setBusy(true);setStatus(format==='pdf'?'Gerando PDF...':'Gerando HTML...');trigger.current?.focus();try{const html=await standaloneReport(report);const blob=format==='pdf'?await pdfReport(report,html):new Blob([html],{type:'text/html;charset=utf-8'});downloadReport(blob,`${reportFilename(report)}.${format}`);setStatus(`${format.toUpperCase()} baixado com sucesso.`)}catch(error){setStatus(error instanceof Error?error.message:'Não foi possível exportar o relatório.')}finally{setBusy(false)}}
 return <div className="report-export-menu" ref={ref} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus()}if(open&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const items=[...ref.current!.querySelectorAll<HTMLButtonElement>('[role=menuitem]')],index=items.indexOf(document.activeElement as HTMLButtonElement);items[(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus()}}}>
 <button ref={trigger} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} aria-busy={busy} disabled={busy} onClick={()=>{setStatus('');setOpen(!open)}}><Download size={15}/>{busy?'Exportando...':'Exportar relatório'}<ChevronDown size={13}/></button>
 {open?<div id={menuId} className="report-export-options" role="menu" aria-label="Exportar relatório"><button role="menuitem" onClick={()=>void run('html')}><FileCode size={16}/>Baixar HTML</button><button role="menuitem" onClick={()=>void run('pdf')}><FileDown size={16}/>Baixar PDF</button></div>:null}
 <p role="status" aria-live="polite" className="report-export-status">{status}</p></div>
}
