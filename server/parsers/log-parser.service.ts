import { ILogParser, ParserResult, ParsedLogEntry } from './parser.interface';
import JSONLogParser from './json.parser';
import ApacheLogParser from './apache.parser';
import NginxLogParser from './nginx.parser';

/**
 * Unified Log Parser Service
 * Automatically detects log format and routes to appropriate parser
 */

const parsers: ILogParser[] = [
  JSONLogParser,
  ApacheLogParser,
  NginxLogParser,
];

export interface ParseOptions {
  source?: string;
  forceFormat?: 'json' | 'apache' | 'nginx';
}

/**
 * Auto-detect log format and parse content
 */
export function parseLogs(content: string, options: ParseOptions = {}): ParserResult {
  const { source, forceFormat } = options;

  if (!content || content.trim().length === 0) {
    return {
      format: 'unknown',
      entries: [],
      total_parsed: 0,
      failed: 0,
      errors: ['Empty log content'],
    };
  }

  // If format is forced, use that parser
  if (forceFormat) {
    const parser = getParserByFormat(forceFormat);
    if (parser) {
      return parser.parse(content, source);
    }
  }

  // Auto-detect format
  let detectedParser: ILogParser | null = null;

  for (const parser of parsers) {
    if (parser.detect(content)) {
      detectedParser = parser;
      break;
    }
  }

  if (!detectedParser) {
    // Fallback to JSON parser if no format detected
    return {
      format: 'unknown',
      entries: [],
      total_parsed: 0,
      failed: 0,
      errors: ['Unable to detect log format. Supported formats: JSON, Apache, Nginx'],
    };
  }

  return detectedParser.parse(content, source);
}

/**
 * Get parser by format name
 */
function getParserByFormat(format: string): ILogParser | null {
  const parserMap: Record<string, ILogParser> = {
    json: JSONLogParser,
    apache: ApacheLogParser,
    nginx: NginxLogParser,
  };
  return parserMap[format] || null;
}

/**
 * Parse logs from a file (async wrapper for potential file operations)
 */
export async function parseLogsFromFile(
  filePath: string,
  options: ParseOptions = {}
): Promise<ParserResult> {
  // For now, this is a placeholder. In a real implementation,
  // you would read the file from disk or S3, etc.
  throw new Error('File reading not implemented. Use parseLogs() with string content.');
}

/**
 * Get supported formats
 */
export function getSupportedFormats(): string[] {
  return ['json', 'apache', 'nginx'];
}

/**
 * Validate parsed log entry
 */
export function validateLogEntry(entry: ParsedLogEntry): boolean {
  return !!entry.timestamp && !!entry.message;
}

/**
 * Filter logs by criteria
 */
export function filterLogs(
  entries: ParsedLogEntry[],
  filters: {
    level?: string;
    status_code?: number;
    start_time?: string;
    end_time?: string;
    ip_address?: string;
  } = {}
): ParsedLogEntry[] {
  return entries.filter(entry => {
    if (filters.level && entry.level !== filters.level) return false;
    if (filters.status_code && entry.status_code !== filters.status_code) return false;
    if (filters.start_time && entry.timestamp < filters.start_time) return false;
    if (filters.end_time && entry.timestamp > filters.end_time) return false;
    if (filters.ip_address && entry.ip_address !== filters.ip_address) return false;
    return true;
  });
}

/**
 * Aggregate logs by time period
 */
export function aggregateLogsByTime(
  entries: ParsedLogEntry[],
  period: 'hour' | 'day' = 'hour'
): Record<string, ParsedLogEntry[]> {
  const result: Record<string, ParsedLogEntry[]> = {};

  for (const entry of entries) {
    const date = new Date(entry.timestamp);
    let key: string;

    if (period === 'hour') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(entry);
  }

  return result;
}

export default {
  parseLogs,
  parseLogsFromFile,
  getSupportedFormats,
  validateLogEntry,
  filterLogs,
  aggregateLogsByTime,
};
