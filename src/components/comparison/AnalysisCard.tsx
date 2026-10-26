import type { ReactNode } from 'react'
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from '@/components/ui/card'

export function AnalysisCard({title,question,children,empty=false}: {title:string;question?:string;children:ReactNode;empty?:boolean}) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle>{question&&<CardDescription>{question}</CardDescription>}</CardHeader><CardContent>{empty?<div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border bg-bg/50 text-center text-sm font-semibold text-slate">DADOS INSUFICIENTES<br/>São necessárias observações comparáveis para esta análise.</div>:children}</CardContent></Card>
}
