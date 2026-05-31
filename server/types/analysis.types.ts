import { AnalysisResult } from '../agents/analysis.agent';
import { IntentRequest, IntentResponse } from '../agents/intent.agent';
import { DataFetchResult } from '../agents/data.agent';
import { ParserResult } from '../parsers/parser.interface';

export interface AnalyzeLogsRequest extends IntentRequest {
  log_input?: {
    content: string;
    source?: string;
    format?: 'json' | 'apache' | 'nginx';
  };
  time_window?: {
    start: string;
    end: string;
  };
  limit?: number;
  persist_logs?: boolean;
  include_raw_logs?: boolean;
}

export interface AnalysisReport {
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  executive_summary: string;
  highlights: string[];
  recommended_actions: string[];
  report_notes: string;
  generated_at: string;
}

export interface AnalysisPipelineResponse {
  intent: IntentResponse;
  ingestion?: {
    format: string;
    total_parsed: number;
    failed: number;
    stored_count: number;
    errors: string[];
  };
  data: Omit<DataFetchResult, 'logs'> & {
    logs?: DataFetchResult['logs'];
  };
  analysis: AnalysisResult;
  report: AnalysisReport;
}
