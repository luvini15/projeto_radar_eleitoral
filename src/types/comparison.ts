import type {ExecutiveMetrics,ExecutiveGroup} from './executive'
export interface FollowerPoint{date:string;followers:number|null;source?:string;source_label?:string;sources?:string[]}
export interface ComparisonRow{id:number;name:string;position?:string|null;summary:ExecutiveMetrics;themes:ExecutiveGroup[];formats:ExecutiveGroup[];hours:ExecutiveGroup[];daily:ExecutiveGroup[];follower_history:FollowerPoint[]}
export interface ComparisonResponse{period:{from:string;to:string;days:number};posts_per_profile:number;slates:ComparisonRow[];profiles:ComparisonRow[]}
