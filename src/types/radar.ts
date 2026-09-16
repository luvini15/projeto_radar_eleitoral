export interface ProfileOverview { profile_id: number; username: string; role: string; posts_analyzed: number; comments: number | null; likes: number | null; observed_interactions: number | null }
export interface OverviewData { summary: {profiles_monitored: number; posts_analyzed: number; comments: number | null; observed_interactions: number}; profiles: ProfileOverview[] }
export interface Post {
  post_id: number;
  profile: { username: string; role: string };
  content: { caption: string | null; format: string; theme: string; url: string | null; published_at: string | null; thumbnail_url: string | null };
  metrics: { likes: number | null; comments: number | null; views: number | null; plays: number | null; shares: number | null; saves: number | null; observed_interactions: number | null; collected_at: string | null; interactions_complete: boolean };
}
export interface Group { theme?: string; format?: string; posts: number; avg_comments: number | null; avg_likes: number | null; avg_views: number | null; avg_observed_interactions: number | null }
export interface Cell { weekday_index: number; weekday: string; hour: number; hour_label: string; posts: number; avg_observed_interactions: number | null; avg_comments: number | null }
export interface Follower { profile_id: number; username: string; role: string; current_followers: number | null; growth_absolute: number | null; growth_percent: number | null; days_with_data: number; history: {date: string; followers: number | null; collected_at: string}[] }
export interface RankedPost { post_id: number; username: string; caption: string | null; format: string; url: string | null; comments: number | null; views: number | null; plays: number | null; observed_interactions: number | null }
