import { ILogParser, ParserResult, ParsedLogEntry } from './parser.interface';

/**
 * Apache Log Parser
 * Supports Common Log Format (CLF) and Combined Log Format
 */
export class ApacheLogParser implements ILogParser {
  // Combined Log Format regex
  // Format: IP - - [timestamp] "method path protocol" status size "referer" "user-agent"
  private readonly combinedPattern = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d+) (\d+) "([^"]*)" "([^"]*)"/;

  // Common Log Format regex
  // Format: IP - - [timestamp] "method path protocol" status size
  private readonly commonPattern = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d+) (\d+)/;

  // Error log format
  private readonly errorPattern = /^\[([^\]]+)\] \[([^\]]+)\] \[client ([^\]]+)\] (.+)/;

  detect(content: string): boolean {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length === 0) return false;

    // Check if any line matches Apache log patterns
    for (const line of lines.slice(0, 10)) {
      if (this.combinedPattern.test(line) || this.commonPattern.test(line) || this.errorPattern.test(line)) {
        return true;
      }
    }
    return false;
  }

  parse(content: string, source?: string): ParserResult {
    const result: ParserResult = {
      format: 'apache',
      entries: [],
      total_parsed: 0,
      failed: 0,
      errors: [],
    };

    const lines = content.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        let entry: ParsedLogEntry | null = null;

        // Try combined log format first
        const combinedMatch = line.match(this.combinedPattern);
        if (combinedMatch) {
          const [, ip, timestamp, method, path, protocol, status, size, referer, userAgent] = combinedMatch;
          entry = {
            timestamp: this.parseApacheTimestamp(timestamp),
            message: `${method} ${path} ${protocol} - ${status}`,
            source: source || 'apache',
            format: 'apache',
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
        // Try common log format
        else {
          const commonMatch = line.match(this.commonPattern);
          if (commonMatch) {
            const [, ip, timestamp, method, path, protocol, status, size] = commonMatch;
            entry = {
              timestamp: this.parseApacheTimestamp(timestamp),
              message: `${method} ${path} ${protocol} - ${status}`,
              source: source || 'apache',
              format: 'apache',
              ip_address: ip,
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
              const [, timestamp, level, clientIp, message] = errorMatch;
              entry = {
                timestamp: this.parseApacheTimestamp(timestamp),
                level: level || 'error',
                message: message,
                source: source || 'apache',
                format: 'apache',
                ip_address: clientIp,
                raw_data: line,
                parsed_at: new Date().toISOString(),
              };
            }
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
   * Parse Apache timestamp format: 01/Mar/2026:14:30:45 +0000
   */
  private parseApacheTimestamp(timestamp: string): string {
    try {
      // Apache format: DD/Mon/YYYY:HH:MM:SS +ZZZZ
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
}

export default new ApacheLogParser();