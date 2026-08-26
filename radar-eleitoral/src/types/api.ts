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
