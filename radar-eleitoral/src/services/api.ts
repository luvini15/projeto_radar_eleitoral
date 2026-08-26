import type {
  BenchmarkResponse,
  CompetitorsResponse,
  FollowersHistoryResponse,
  OverviewResponse,
  PostsResponse,
  RankingsResponse,
  ThemesFormatsResponse,
  TimePerformanceResponse,
} from '@/types/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
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
