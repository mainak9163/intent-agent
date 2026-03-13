/**
 * Log Parser Interface
 * All log parsers must implement this interface
 */

export interface ParsedLogEntry {
  id?: number;
  timestamp: string;
  level?: string;
  message: string;
  source?: string;
  format: string;
  ip_address?: string;
  user_agent?: string;
  status_code?: number;
  request_method?: string;
  request_path?: string;
  response_size?: number;
  duration_ms?: number;
  raw_data: string;
  parsed_at: string;
}

export interface ParserResult {
  format: string;
  entries: ParsedLogEntry[];
  total_parsed: number;
  failed: number;
  errors: string[];
}

export interface ILogParser {
  /**
   * Detect if this parser can handle the given log content
   */
  detect(content: string): boolean;

  /**
   * Parse the log content and return structured entries
   */
  parse(content: string, source?: string): ParserResult;
}
