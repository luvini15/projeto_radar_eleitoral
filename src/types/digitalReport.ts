import type {ExecutiveReport,ExecutiveGroup,ExecutiveProfile,ExecutiveMetrics} from './executive'
import type {PostItem} from './api'
import type {Slate} from '@/services/radarApi'
import type {FollowerPoint} from './comparison'
export interface ReportFilters{start_date:string;end_date:string;slate_ids:number[];profile_id:number|null;compare_slates:boolean;limit_per_profile:number}
export type ReportProfile=ExecutiveProfile&{follower_history:FollowerPoint[];growth_absolute:number|null;growth_percent:number|null}
export interface ReportComparison{slate:Slate;summary:ExecutiveMetrics;profiles:ReportProfile[];follower_history:FollowerPoint[]}
export interface DigitalReport{id:number;schema_version:number;title:string;campaign:{id:number;name:string};generated_at:string;last_collection_at:string|null;filters:ReportFilters;profile_ids:number[];slates:Slate[];
 analysis:Omit<ExecutiveReport,'profiles'>&{profiles:ReportProfile[];hours:ExecutiveGroup[];weekdays:ExecutiveGroup[];follower_history:FollowerPoint[]};comparisons:ReportComparison[];
 cover?:{post:PostItem;image:{cached:boolean;url:string|null}}|null;
 highlights:{post:PostItem;distinctions:string[];image:{cached:boolean;url:string|null}}[];
 editorial_version?:number;editorial_insights:{id:string;title:string;text:string;value:number|null;headline:string;facts:string[];interpretation:string;implication:string;status:'available'|'insufficient';posts?:number;post_id?:number}[];
 methodology:{title:string;text:string}[];limitations:string[];interaction_coverage:{available_posts:number;complete_posts:number;posts:number}}
export interface ReportListItem{id:number;title:string;created_at:string;status:string;period:{from:string;to:string;days:number}}
