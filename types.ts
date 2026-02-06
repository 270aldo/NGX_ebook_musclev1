export type IntelligenceMode = 'mentor' | 'researcher' | 'coach' | 'visionary';

export interface UsageSummary {
  creditsCharged: number;
  modelUsed: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Message {
  role: 'agent' | 'user';
  content: string;
  image?: string; // Base64 data string
  groundingSources?: GroundingSource[];
  usage?: UsageSummary;
  timestamp: Date;
}

export interface Quote {
  text: string;
  author: string;
  source: string;
}

export interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  readTime: number;
  keyPoints: string[];
  quote: Quote;
}
