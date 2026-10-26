import type {MediaInvestment} from './mediaInvestment'
import type { Slate } from '@/services/radarApi'
import type { PostItem } from './api'
export interface ExecutiveMetrics {
  growth_absolute:number|null;growth_percent:number|null;days_with_data:number;posts_per_day:number;
  posts:number; followers:number|null; profiles:number; followers_profiles_with_data:number;
  likes:number|null;comments:number|null;plays:number|null;views:number|null;observed_interactions:number|null;
  avg_likes:number|null;avg_comments:number|null;avg_plays:number|null;avg_views:number|null;avg_observed_interactions:number|null;
  coverage:Record<string,number>;
}
export type ExecutiveGroup=ExecutiveMetrics & {theme?:string;format?:string;hour?:number;weekday?:number;date?:string;username?:string;id?:number}
export interface ExecutiveProfile extends ExecutiveMetrics {id:number;username:string;role:string;position:string|null;followers:number|null;slate_id:number|null}
export interface ExecutiveReport {
  media_investment?:MediaInvestment;
  campaign:{id:number;name:string};slate:Slate|null;period:{from:string;to:string;days:number};
  sample:{posts_per_profile:number;dated_posts_only:boolean};summary:ExecutiveMetrics;
  profiles:ExecutiveProfile[];themes:ExecutiveGroup[];formats:ExecutiveGroup[];daily:ExecutiveGroup[];
  last_collected_at:string|null;collection:{status:string;finished_at:string|null}|null;
  data_status:'NO_DATA'|'INSUFFICIENT'|'SUFFICIENT';methodology:string[];
  insights:{top_posts:Record<string,PostItem|null>;theme:ExecutiveGroup|null;most_published_theme:ExecutiveGroup|null;
    format:ExecutiveGroup|null;hour:ExecutiveGroup|null;weekday:ExecutiveGroup|null;profile:ExecutiveGroup|null;peak:ExecutiveGroup|null};
}
export interface SlateComparison {slates:Array<{slate:Slate;summary:ExecutiveMetrics;media_investment?:MediaInvestment;profiles:ExecutiveProfile[];themes:ExecutiveGroup[];formats:ExecutiveGroup[];insights:ExecutiveReport['insights'];daily:ExecutiveGroup[];data_status:ExecutiveReport['data_status']}>}
