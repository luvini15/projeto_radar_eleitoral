export const periodOptions=[7,15,30,60,90,180,365] as const
export function utcPeriod(days:number, now=new Date()) {
  const end=now.toISOString().slice(0,10)
  const first=new Date(end+'T00:00:00Z');first.setUTCDate(first.getUTCDate()-days+1)
  return {start:first.toISOString().slice(0,10),end}
}
export function validPeriod(start:string,end:string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(start)&&/^\d{4}-\d{2}-\d{2}$/.test(end)&&start<=end&&
    !Number.isNaN(Date.parse(start))&&!Number.isNaN(Date.parse(end))&&new Date(start).toISOString().slice(0,10)===start&&new Date(end).toISOString().slice(0,10)===end
}
