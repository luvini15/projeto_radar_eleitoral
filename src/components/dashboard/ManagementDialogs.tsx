import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogCancel } from '@/components/animate-ui/components/radix/alert-dialog'
export function ManagementDialog({open,onClose,title,description,children,busy=false}:{open:boolean;onClose:()=>void;title:string;description:string;children:React.ReactNode;busy?:boolean}) {
  return <AlertDialog open={open} onOpenChange={next=>{if(!next&&!busy)onClose()}}><AlertDialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto border-white/15 bg-[#101010] p-5 text-white"><AlertDialogTitle className="text-lg">{title}</AlertDialogTitle><AlertDialogDescription className="text-sm leading-6 text-white/55">{description}</AlertDialogDescription>{children}<AlertDialogCancel disabled={busy} className="border-white/15 bg-transparent text-white hover:bg-white/5">Cancelar</AlertDialogCancel></AlertDialogContent></AlertDialog>
}
export function ConfirmManagementAction({open,onClose,title,impact,expected,action,onDone,button='Confirmar exclusão'}:{open:boolean;onClose:()=>void;title:string;impact:string;expected:string;action:()=>Promise<unknown>;onDone:()=>void;button?:string}) {
  const [value,setValue]=React.useState(''),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('')
  return <ManagementDialog open={open} onClose={onClose} title={title} description={impact} busy={busy}><form className="space-y-4" onSubmit={async e=>{e.preventDefault();if(value!==expected||busy)return;setBusy(true);setError('');try{await action();onDone();onClose()}catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível concluir.')}finally{setBusy(false)}}}>
    <label className="block text-sm">Digite <strong className="break-all text-white">{expected}</strong> para confirmar<Input aria-label="Confirmação da operação" value={value} onChange={e=>setValue(e.target.value)} autoComplete="off" disabled={busy}/></label>
    {error?<p role="alert" className="text-sm text-[#ff8d60]">{error}</p>:null}<Button type="submit" disabled={value!==expected||busy} className="w-full">{busy?'Processando…':button}</Button>
  </form></ManagementDialog>
}
