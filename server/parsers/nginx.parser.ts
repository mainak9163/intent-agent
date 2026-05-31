import { ILogParser, ParserResult, ParsedLogEntry } from './parser.interface';

/**
 * Nginx Log Parser
 * Supports default Nginx access log and error log formats
 */
export class NginxLogParser implements ILogParser {
  // Default Nginx access log format
  // Format: IP - - [timestamp] "method path protocol" status size "referer" "user-agent"
  private readonly accessPattern = /^(\S+) - - \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d+) (\d+) "([^"]*)" "([^"]*)"/;

  // Nginx error log format
  // Format: YYYY/MM/DD HH:MM:SS [level] PID#tid: message
  private readonly errorPattern = /^(\d{4}\/\d{2}\/\d{2}) (\d{2}:\d{2}:\d{2}) \[(\w+)\] (\d+)#(\d+): (.+)/;

  detect(content: string): boolean {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length === 0) return false;

    // Check if any line matches Nginx log patterns
    for (const line of lines.slice(0, 10)) {
      if (this.accessPattern.test(line) || this.errorPattern.test(line)) {
        return true;
      }
    }
    return false;
  }

  parse(content: string, source?: string): ParserResult {
    const result: ParserResult = {
      format: 'nginx',
      entries: [],
      total_parsed: 0,
      failed: 0,
      errors: [],
    };

    const lines = content.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        let entry: ParsedLogEntry | null = null;

        // Try access log format
        const accessMatch = line.match(this.accessPattern);
        if (accessMatch) {
          const [, ip, timestamp, method, path, protocol, status, size, referer, userAgent] = accessMatch;
          entry = {
            timestamp: this.parseNginxTimestamp(timestamp),
            message: `${method} ${path} ${protocol} - ${status}`,
            source: source || 'nginx',
            format: 'nginx',
            ip_address: ip,
            user_agent: userAgent,
            status_code: parseInt(status),
            request_method: method,
            request_path: path,
            response_size: parseInt(size),
            raw_data: line,
            parsed_at: new Date().toISOString(),
          };
        }
        // Try error log format
        else {
          const errorMatch = line.match(this.errorPattern);
          if (errorMatch) {
            const [, date, time, level, pid, tid, message] = errorMatch;
            entry = {
              timestamp: this.parseNginxErrorTimestamp(`${date} ${time}`),
              level: level.toLowerCase(),
              message: message,
              source: source || 'nginx',
              format: 'nginx',
              raw_data: line,
              parsed_at: new Date().toISOString(),
            };
          }
        }

        if (entry) {
          result.entries.push(entry);
          result.total_parsed++;
        } else {
          result.failed++;
          result.errors.push(`Failed to parse line: ${line.substring(0, 100)}...`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Error parsing line: ${error}`);
      }
    }

    return result;
  }

  /**
   * Parse Nginx access log timestamp: 13/Mar/2026:14:30:45 +0000
   */
  private parseNginxTimestamp(timestamp: string): string {
    try {
      const months: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
      };

      const parts = timestamp.match(/(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})/);
      if (parts) {
        const [, day, monthStr, year, hour, min, sec, tz] = parts;
        const month = months[monthStr];
        const date = new Date(parseInt(year), month, parseInt(day), parseInt(hour), parseInt(min), parseInt(sec));
        return date.toISOString();
      }
      return timestamp;
    } catch {
      return timestamp;
    }
  }

  /**
   * Parse Nginx error log timestamp: 2026/03/13 14:30:45
   */
  private parseNginxErrorTimestamp(timestamp: string): string {
    try {
      const parts = timestamp.match(/(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
      if (parts) {
        const [, year, month, day, hour, min, sec] = parts;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(min), parseInt(sec));
        return date.toISOString();
      }
      return timestamp;
    } catch {
      return timestamp;
    }
  }
}

export default new NginxLogParser();