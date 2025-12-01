export type IntelligenceMode = 'mentor' | 'researcher' | 'coach' | 'visionary';

export interface Message {
  role: 'agent' | 'user';
  content: string;
  image?: string; // Base64 data string
  groundingSources?: { title: string; uri: string }[];
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