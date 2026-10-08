import type { DailyTotals } from '../types/api'

const object = (value:unknown):Record<string,unknown> => value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}
const number = (value:unknown):number|null => typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null

function totals(input:unknown):DailyTotals {
  const value=object(input), samples=object(value.metric_samples)
  return {
    posts:number(value.posts), interactions:number(value.interactions), likes:number(value.likes),
    comments:number(value.comments), views:number(value.views), plays:number(value.plays),
    shares:number(value.shares), saves:number(value.saves),
    metric_samples:{interactions:number(samples.interactions),likes:number(samples.likes),comments:number(samples.comments),views:number(samples.views),plays:number(samples.plays),shares:number(samples.shares),saves:number(samples.saves)},
  }
}

// Validate at the rendering boundary: TypeScript does not validate JSON at runtime.
// Missing coverage is unknown (null), never zero; do not reconstruct totals from profiles.
export function normalizeDailyAnalytics(input:unknown):Array<DailyTotals&{date:string;profiles:Record<string,DailyTotals>}> {
  if(!Array.isArray(input))return []
  return input.flatMap(item=>{
    const value=object(item)
    if(typeof value.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value.date)||!Number.isFinite(Date.parse(value.date)))return []
    return [{...totals(value),date:value.date,profiles:Object.fromEntries(Object.entries(object(value.profiles)).map(([username,metrics])=>[username,totals(metrics)]))}]
  }).sort((a,b)=>a.date.localeCompare(b.date))
}
