import type { Follower } from '@/types/radar'
// Complete common dates only: never forward-fill, interpolate or treat a missing profile as zero.
export function aggregateFollowerHistory(profiles:Follower[]) {
  if(!profiles.length)return []
  const dates=[...new Set(profiles.flatMap(p=>p.history.map(point=>point.date)))].sort()
  return dates.flatMap(date=>{
    const points=profiles.map(profile=>profile.history.find(point=>point.date===date)?.followers)
    return points.every((value):value is number=>typeof value==='number')?[{date,followers:points.reduce((a,b)=>a+b,0)}]:[]
  })
}
