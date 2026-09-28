import type {
  BenchmarkResponse,
  CompetitorsResponse,
  FollowersHistoryResponse,
  OverviewResponse,
  PostsResponse,
  RankingsResponse,
  ThemesFormatsResponse,
  TimePerformanceResponse,
  TrendsResponse,
  IntelligenceResponse,
  Region,
  CollectionRun,
  CampaignDetails,
  FilteredAnalytics,
  CollectionSchedule,
  Evidence,
} from '@/types/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const CAMPAIGN_ID = Number(import.meta.env.VITE_CAMPAIGN_ID || 1)

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  })
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`)
  return response.json() as Promise<T>
}

export const getOverview = (campaignId = CAMPAIGN_ID) => request<OverviewResponse>(`/api/campaigns/${campaignId}/overview?limit=25`)
export const getBenchmark = (campaignId = CAMPAIGN_ID) => request<BenchmarkResponse>(`/api/campaigns/${campaignId}/benchmark?limit=25`)
export const getPosts = (campaignId = CAMPAIGN_ID) => request<PostsResponse>(`/api/campaigns/${campaignId}/posts?limit_per_profile=25`)
export const getRankings = (campaignId = CAMPAIGN_ID) => request<RankingsResponse>(`/api/campaigns/${campaignId}/rankings?limit_per_profile=25&top_n=10`)
export const getFollowersHistory = (campaignId = CAMPAIGN_ID, days = 60) => request<FollowersHistoryResponse>(`/api/campaigns/${campaignId}/followers-history?days=${days}`)
export const getThemesFormats = (campaignId = CAMPAIGN_ID) => request<ThemesFormatsResponse>(`/api/campaigns/${campaignId}/themes-formats?limit_per_profile=25`)
export const getTimePerformance = (campaignId = CAMPAIGN_ID) => request<TimePerformanceResponse>(`/api/campaigns/${campaignId}/time-performance?limit_per_profile=25`)
export const getCompetitors = (campaignId = CAMPAIGN_ID) => request<CompetitorsResponse>(`/api/campaigns/${campaignId}/competitors?limit=25&days=60`)
export const syncCampaign = (campaignId = CAMPAIGN_ID) => request(`/api/campaigns/${campaignId}/sync?limit=25`, { method: 'POST' })
export const getRegions = () => request<{regions:Region[]}>('/api/regions')
const trendQuery = (startDate:string,endDate:string,regionId?:number|null,theme?:string) => new URLSearchParams({start_date:startDate,end_date:endDate,...(regionId?{region_id:String(regionId)}:{}),...(theme?{theme}:{})}).toString()
export interface TerritorialOptions { profileIds?:number[]; format?:string; origin?:string }
function territorialQuery(start:string,end:string,regionId?:number|null,theme?:string,options:TerritorialOptions={}) {
  const query=new URLSearchParams(trendQuery(start,end,regionId,theme))
  options.profileIds?.forEach(id=>query.append('profile_id',String(id)))
  if(options.format)query.set('format',options.format)
  if(options.origin)query.set('territorial_origin',options.origin)
  return query.toString()
}
export const getTrends = (start:string,end:string,regionId?:number|null,theme?:string,campaignId=CAMPAIGN_ID,options:TerritorialOptions={}) => request<TrendsResponse>(`/api/campaigns/${campaignId}/trends?${territorialQuery(start,end,regionId,theme,options)}`)
export const getTrendPosts = (start:string,end:string,regionId:number,theme:string,campaignId:number,options:TerritorialOptions={},offset=0) => request<{total:number;posts:Evidence[];offset:number;limit:number}>(`/api/campaigns/${campaignId}/trends/posts?${territorialQuery(start,end,regionId,theme,options)}&offset=${offset}&limit=50`)
export const getIntelligence = (startDate:string,endDate:string,regionId?:number|null,campaignId=CAMPAIGN_ID) => request<IntelligenceResponse>(`/api/campaigns/${campaignId}/intelligence?${trendQuery(startDate,endDate,regionId)}`)
export const createReport = (payload:{region_id:number|null;start_date:string;end_date:string;report_type:string},campaignId=CAMPAIGN_ID) => request<{id:number;status:string;html_url:string;pdf_method:string}>(`/api/campaigns/${campaignId}/reports`,{method:'POST',body:JSON.stringify(payload)})
export const absoluteApiUrl = (path:string) => `${API_URL}${path}`
export const getCampaign = (campaignId=CAMPAIGN_ID) => request<CampaignDetails>(`/api/campaigns/${campaignId}`)
export const getCollections = (campaignId=CAMPAIGN_ID) => request<{campaign_id:number;next_collection:string|null;schedule:CollectionSchedule;collections:CollectionRun[]}>(`/api/campaigns/${campaignId}/collections`)
export const runCollection = (campaignId=CAMPAIGN_ID) => request(`/api/campaigns/${campaignId}/collections`,{method:'POST'})
export const getFilteredAnalytics = (start:string,end:string,profileIds:number[]=[],filters:{regionId?:number|null;theme?:string;format?:string;origin?:string;competitorsOnly?:boolean}={},campaignId=CAMPAIGN_ID) => {const q=new URLSearchParams({start_date:start,end_date:end});if(filters.competitorsOnly){q.set('role','COMPETITOR');q.set('profile_selection','selected')}profileIds.forEach(id=>q.append('profile_id',String(id)));if(filters.regionId)q.set('region_id',String(filters.regionId));if(filters.theme)q.set('theme',filters.theme);if(filters.format)q.set('format',filters.format);if(filters.origin)q.set('territorial_origin',filters.origin);return request<FilteredAnalytics>(`/api/campaigns/${campaignId}/analytics?${q}`)}
