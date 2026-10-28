import {utcPeriod,validPeriod} from '../utils/analysisPeriod.ts'
// Configuration and collectors never inherit analysis filters.
export function scopedCampaignUrl(path:string,userId?:string):string {
 const match=path.match(/\/campaigns\/(\d+)(?:[/?]|$)/)||path.match(/[?&]campaign_id=(\d+)(?:&|$)/)
 if(!match||path.includes('full_campaign=1')||/\/(slates|sync|available-profiles|profile-links|restore)(?:[/?]|$)/.test(path))return path
 try{
  const url=new URL(path,window.location.origin)
  const slate=JSON.parse(localStorage.getItem('radar:slate:v1')||'{}')[match[1]]
  if(slate&&/^\d+$/.test(slate)&&!url.searchParams.has('slate_id'))url.searchParams.set('slate_id',slate)
  const current=userId?localStorage.getItem(`radar:campaign:v2:${userId}`):null
  const profile=localStorage.getItem('radar:profile:v1')
  if(profile&&current===match[1]&&!url.searchParams.has('scope_profile_id')&&!url.searchParams.has('profile_directory'))url.searchParams.set('scope_profile_id',profile)
  const days=localStorage.getItem('radar:days:v1')||'30'
  if(/^\d+$/.test(days))url.searchParams.set('analysis_days',days)
  const range=JSON.parse(localStorage.getItem('radar:period:v1')||'null')
  const dates=range&&validPeriod(range.start,range.end)?range:utcPeriod(Number(days))
  url.searchParams.set('period_start',dates.start);url.searchParams.set('period_end',dates.end)
  if(url.searchParams.has('start_date'))url.searchParams.set('start_date',dates.start)
  if(url.searchParams.has('end_date'))url.searchParams.set('end_date',dates.end)
  const sample=localStorage.getItem('radar:sample:v1')
  if(sample&&/^\d+$/.test(sample))url.searchParams.set('sample_limit',sample)
  return url.origin===window.location.origin?url.pathname+url.search:url.toString()
 }catch{return path}
}
