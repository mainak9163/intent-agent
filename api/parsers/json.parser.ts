import { ILogParser, ParserResult, ParsedLogEntry } from './parser.interface';

/**
 * JSON Log Parser
 * Handles structured JSON logs (one JSON object per line or array of objects)
 */
export class JSONLogParser implements ILogParser {
  detect(content: string): boolean {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length === 0) return false;

    // Check if first non-empty line is valid JSON
    try {
      JSON.parse(lines[0]);
      return true;
    } catch {
      return false;
    }
  }

  parse(content: string, source?: string): ParserResult {
    const result: ParserResult = {
      format: 'json',
      entries: [],
      total_parsed: 0,
      failed: 0,
      errors: [],
    };

    const lines = content.split('\n').filter(l => l.trim());
    const isJSONArray = content.trim().startsWith('[');

    let jsonObjects: any[];

    try {
      if (isJSONArray) {
        // Parse as JSON array
        jsonObjects = JSON.parse(content);
        if (!Array.isArray(jsonObjects)) {
          jsonObjects = [jsonObjects];
        }
      } else {
        // Parse line by line
        jsonObjects = lines.map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        }).filter(obj => obj !== null);
      }
    } catch (error) {
      result.errors.push(`Failed to parse JSON: ${error}`);
      return result;
    }

    for (const obj of jsonObjects) {
      try {
        const entry: ParsedLogEntry = {
          timestamp: obj.timestamp || obj.time || obj['@timestamp'] || new Date().toISOString(),
          level: obj.level || obj.severity || obj.logLevel || undefined,
          message: obj.message || obj.msg || obj.text || JSON.stringify(obj),
          source: source || obj.source || obj.service || obj.app || undefined,
          format: 'json',
          ip_address: obj.ip || obj.ip_address || obj.clientIP || undefined,
          user_agent: obj.user_agent || obj.userAgent || obj.ua || undefined,
          status_code: obj.status || obj.status_code || obj.statusCode ? Number(obj.status || obj.status_code || obj.statusCode) : undefined,
          request_method: obj.method || obj.request_method || undefined,
          request_path: obj.path || obj.url || obj.request_path || undefined,
          response_size: obj.size || obj.response_size || obj.content_length ? Number(obj.size || obj.response_size || obj.content_length) : undefined,
          duration_ms: obj.duration || obj.response_time || obj.duration_ms ? Number(obj.duration || obj.response_time || obj.duration_ms) : undefined,
          raw_data: JSON.stringify(obj),
          parsed_at: new Date().toISOString(),
        };

        result.entries.push(entry);
        result.total_parsed++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to parse entry: ${error}`);
      }
    }

    return result;
  }
}

export default new JSONLogParser();