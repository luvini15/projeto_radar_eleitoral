export interface CampaignRef { id: number; name: string; slug?: string }

export interface OverviewProfile {
  profile_id: number
  username: string
  full_name: string | null
  role: string
  posts_analyzed: number
  posts_with_snapshot: number
  comments: number
  likes: number | null
  likes_available: boolean
  views: number
  plays: number
  observed_interactions: number
}

export interface OverviewResponse {
  campaign: CampaignRef
  summary: {
    profiles_monitored: number
    posts_analyzed: number
    comments: number
    views: number
    plays: number
    observed_interactions: number
  }
  profiles: OverviewProfile[]
}

export interface FollowerPoint { date: string; followers: number | null; collected_at: string }
export interface FollowerProfile {
  profile_id: number
  username: string
  full_name: string | null
  role: string
  current_followers: number | null
  growth_absolute: number | null
  growth_percent: number | null
  days_with_data: number
  history: FollowerPoint[]
}
export interface FollowersHistoryResponse {
  campaign: CampaignRef
  period: { requested_days: number; from: string; to: string }
  profiles: FollowerProfile[]
}

export interface BenchmarkProfile {
  profile_id: number
  username: string
  full_name: string | null
  role: string
  followers: number | null
  posts_analyzed: number
  reels_analyzed: number
  avg_comments_per_post: number | null
  avg_likes_per_post: number | null
  likes_available: boolean
  avg_views_per_reel: number | null
  avg_plays_per_reel: number | null
  avg_observed_interactions: number | null
  interaction_coverage: { complete_posts: number; posts_analyzed: number }
}
export interface BenchmarkResponse { campaign: CampaignRef; profiles: BenchmarkProfile[] }

export interface PostItem {
  post_id: number
  instagram_id: string | null
  shortcode: string
  profile: { id: number; username: string; full_name: string | null; role: string }
  content: {
    type: string | null
    format: string
    product_type: string | null
    theme: string
    caption: string | null
    url: string
    thumbnail_url: string | null
    location_name: string | null
    published_at: string | null
    paid_partnership: boolean | null
  }
  metrics: {
    likes: number | null
    comments: number | null
    views: number | null
    plays: number | null
    shares: number | null
    saves: number | null
    observed_interactions: number | null
    interactions_complete: boolean
    collected_at: string | null
  }
}
export interface PostsResponse { campaign: CampaignRef; total_posts: number; posts: PostItem[] }

export interface RankingItem {
  post_id: number
  shortcode: string
  username: string
  full_name: string | null
  role: string
  type: string | null
  format: string
  caption: string | null
  url: string
  thumbnail_url: string | null
  published_at: string | null
  likes: number | null
  comments: number | null
  views: number | null
  plays: number | null
  observed_interactions: number | null
  is_video: boolean
}
export interface RankingsResponse {
  campaign: CampaignRef
  rankings: {
    top_comments: RankingItem[]
    top_observed_interactions: RankingItem[]
    top_reels_views: RankingItem[]
    top_reels_plays: RankingItem[]
  }
}

export interface ThemeFormatSummary {
  posts: number
  avg_comments: number | null
  avg_likes: number | null
  avg_views: number | null
  avg_plays: number | null
  avg_observed_interactions: number | null
  likes_coverage: number
}
export interface ThemeSummary extends ThemeFormatSummary { theme: string }
export interface FormatSummary extends ThemeFormatSummary { format: string }
export interface ThemesFormatsResponse {
  campaign: CampaignRef
  methodology: { theme_source: string; posts_per_profile: number }
  themes: ThemeSummary[]
  formats: FormatSummary[]
}

export interface TimeCell {
  weekday_index: number
  weekday: string
  hour: number
  hour_label: string
  posts: number
  avg_observed_interactions: number | null
  avg_comments: number | null
  avg_views: number | null
  avg_plays: number | null
}
export interface TimePerformanceResponse {
  campaign: CampaignRef
  methodology: { timezone: string; bucket_hours: number; metric_is_observed_not_causal: boolean }
  best_observed_interactions: TimeCell | null
  best_comments: TimeCell | null
  best_views: TimeCell | null
  best_plays: TimeCell | null
  cells: TimeCell[]
}

export interface CompetitorsResponse { campaign: CampaignRef; profiles: Array<BenchmarkProfile & { current_followers: number | null; growth_absolute: number | null; growth_percent: number | null }> }

export interface Region { id: number; name: string; state: string; population: number | null; description: string | null }
export interface Evidence { post_id: number; date: string | null; profile: string | null; summary: string; url: string; interactions: number | null; likes: number | null; comments: number | null }
export interface TrendItem { theme: string; volume: number; previous_volume: number; growth: number | null; direction: 'alta'|'queda'|'estável'|'sem_base'; interactions: number; average_interactions: number | null; recurrence_days: number; relevance: number; emerging: boolean; evidence: Evidence[] }
export interface TrendsResponse { period: {start:string;end:string}; comparison_period:{start:string;end:string}; filters:{region_id:number|null;theme:string|null}; data_status:'NO_DATA'|'INSUFFICIENT'|'SUFFICIENT'; methodology:{growth:string;score:string}; trends:TrendItem[] }
export interface IntelligenceResponse extends TrendsResponse { alerts:Array<{type:string;severity:string;title:string;description:string;evidence:Evidence[]}>; problems:Array<{theme:string;description:string;frequency:number;interactions:number;evidence:Evidence[]}>; opportunities:Array<{theme:string;description:string;priority:string;evidence:Evidence[]}>; limitations:string[] }
export interface CollectionRun { id:number;campaign_id:number;trigger:string;status:'RUNNING'|'SUCCESS'|'PARTIAL'|'FAILED';started_at:string;finished_at:string|null;profiles_total:number;profiles_succeeded:number;profiles_failed:number;posts_found:number;new_posts:number;post_snapshots_created:number;followers_updated:number;errors:string|null }
export interface CampaignDetails extends CampaignRef {active:boolean;profiles:Array<{id:number;username:string;full_name:string|null;role:string;active:boolean}>}
export interface AnalyticsSummary {posts:number;likes_total:number|null;likes_average:number|null;comments_total:number|null;comments_average:number|null;views_total:number|null;views_average:number|null;plays_total:number|null;plays_average:number|null;interactions:number;interactions_average:number|null}
export interface FilteredAnalytics {data_status:'NO_DATA'|'INSUFFICIENT'|'SUFFICIENT';daily:Array<{date:string;posts:number;interactions:number;profiles:Record<string,{posts:number;interactions:number}>}>;themes:Array<{theme:string}&AnalyticsSummary>;formats:Array<{format:string}&AnalyticsSummary>;profiles:Array<{profile_id:number;username:string;full_name:string|null;role:string;themes:Record<string,number>;theme_performance:Record<string,AnalyticsSummary>;formats:Record<string,number>} & AnalyticsSummary>;follower_history:Array<{profile_id:number;username:string;points:Array<{date:string;followers:number|null}>}>;regions:Array<{region_id:number;region:string}&AnalyticsSummary>;limitations:{missing_metrics_remain_null:boolean;regions_require_explicit_profile_assignment:boolean;observed_interactions_may_be_partial:boolean}}
