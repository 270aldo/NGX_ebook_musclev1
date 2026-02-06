export type ChatMode = 'mentor' | 'researcher' | 'coach' | 'visionary';
export type ModelTier = 'stable' | 'deep_dive' | 'standard' | 'high_quality';

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatUsage {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  groundedQueries: number;
}

export interface GroundingSource {
  title: string;
  uri: string;
}
