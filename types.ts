export interface ChatState {
  input: string;
  result: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
}

export enum Status {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface CheckItem {
  category: string;
  status: 'safe' | 'warning' | 'danger';
  detail: string;
}

export interface AnalysisResult {
  score: number; // 0-100
  riskLevel: 'LAAG' | 'MIDDEN' | 'HOOG';
  summary: string;
  checks: CheckItem[];
  brokenLinks: string[];
  tips: string[];
}

export interface HistoryItem {
  id: string;
  date: string;
  inputSnippet: string;
  score: number;
  riskLevel: string;
}