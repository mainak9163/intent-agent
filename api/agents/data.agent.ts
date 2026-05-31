import env from '../config/env';
import { getDatabase } from '../config/database';
import { IntentResponse } from './intent.agent';
import { ParsedLogEntry } from '../parsers/parser.interface';

/**
 * Data Agent
 * Fetches and filters log data based on intent specifications
 * Stores parsed logs in SQLite and retrieves based on analysis requirements
 */

export interface DataQuery {
  intent: IntentResponse;
  time_window?: {
    start: string;
    end: string;
  };
  limit?: number;
}

export interface DataFetchResult {
  logs: ParsedLogEntry[];
  total_count: number;
  filtered_count: number;
  time_range: {
    start: string;
    end: string;
  };
}

function matchesIntentFilters(entry: ParsedLogEntry, intent: IntentResponse): boolean {
  const levelMap: Record<string, string[]> = {
    security: ['error', 'warn'],
    performance: ['info', 'warn'],
    availability: ['error', 'warn', 'critical'],
    compliance: ['info', 'warn', 'error'],
    usage: ['info'],
    operational: ['info', 'warn', 'error'],
  };

  const levelsToInclude = levelMap[intent.intent_class_id];
  if (levelsToInclude && levelsToInclude.length > 0) {
    if (!entry.level || !levelsToInclude.includes(entry.level)) {
      return false;
    }
  }

  const logSources = intent.suggested_filters.log_sources;
  if (logSources && logSources.length > 0) {
    if (!entry.source || !logSources.includes(entry.source)) {
      return false;
    }
  }

  return true;
}

export function filterLogsInMemory(
  logs: ParsedLogEntry[],
  query: DataQuery
): DataFetchResult {
  const { intent, time_window, limit = 10000 } = query;

  let startTime: Date;
  let endTime: Date;

  if (time_window) {
    startTime = new Date(time_window.start);
    endTime = new Date(time_window.end);
  } else {
    endTime = new Date();
    startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
  }

  const filteredLogs = logs
    .filter((entry) => {
      const timestamp = new Date(entry.timestamp);
      return (
        timestamp >= startTime &&
        timestamp <= endTime &&
        matchesIntentFilters(entry, intent)
      );
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);

  return {
    logs: filteredLogs,
    total_count: filteredLogs.length,
    filtered_count: filteredLogs.length,
    time_range: {
      start: startTime.toISOString(),
      end: endTime.toISOString(),
    },
  };
}

/**
 * Store parsed logs in database
 */
export async function storeLogs(logs: ParsedLogEntry[]): Promise<number> {
  if (!env.persistenceEnabled) {
    return 0;
  }

  const db = getDatabase();
  const insert = db.prepare(`
    INSERT INTO logs (
      timestamp, level, message, source, format,
      ip_address, user_agent, status_code, request_method,
      request_path, response_size, duration_ms, raw_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((entries: ParsedLogEntry[]) => {
    let count = 0;
    for (const entry of entries) {
      try {
        insert.run(
          entry.timestamp,
          entry.level || null,
          entry.message,
          entry.source || null,
          entry.format,
          entry.ip_address || null,
          entry.user_agent || null,
          entry.status_code || null,
          entry.request_method || null,
          entry.request_path || null,
          entry.response_size || null,
          entry.duration_ms || null,
          entry.raw_data
        );
        count++;
      } catch (error) {
        console.error('Error storing log entry:', error);
      }
    }
    return count;
  });

  return insertMany(logs);
}

/**
 * Fetch logs based on intent specifications
 */
export async function fetchLogs(query: DataQuery): Promise<DataFetchResult> {
  if (!env.persistenceEnabled) {
    return filterLogsInMemory([], query);
  }

  const db = getDatabase();
  const { intent, time_window, limit = 10000 } = query;

  // Build WHERE clause based on intent filters
  const conditions: string[] = [];
  const params: any[] = [];

  // Time window filter
  let startTime: Date;
  let endTime: Date;

  if (time_window) {
    startTime = new Date(time_window.start);
    endTime = new Date(time_window.end);
  } else {
    // Default to last 24 hours if no time window specified
    endTime = new Date();
    startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
  }

  conditions.push('timestamp >= ? AND timestamp <= ?');
  params.push(startTime.toISOString(), endTime.toISOString());

  // Level filter if intent specifies it
  const levelMap: Record<string, string[]> = {
    security: ['error', 'warn'],
    performance: ['info', 'warn'],
    availability: ['error', 'warn', 'critical'],
    compliance: ['info', 'warn', 'error'],
    usage: ['info'],
    operational: ['info', 'warn', 'error'],
  };

  const levelsToInclude = levelMap[intent.intent_class_id];
  if (levelsToInclude && levelsToInclude.length > 0) {
    const placeholders = levelsToInclude.map(() => '?').join(',');
    conditions.push(`level IN (${placeholders})`);
    params.push(...levelsToInclude);
  }

  // Log source filter if intent specifies it
  if (intent.suggested_filters.log_sources && intent.suggested_filters.log_sources.length > 0) {
    const placeholders = intent.suggested_filters.log_sources.map(() => '?').join(',');
    conditions.push(`source IN (${placeholders})`);
    params.push(...intent.suggested_filters.log_sources);
  }

  // Build query
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countQuery = `SELECT COUNT(*) as count FROM logs ${whereClause}`;
  const totalResult = db.prepare(countQuery).get(params) as { count: number };
  const totalCount = totalResult.count;

  // Fetch logs with limit
  const selectQuery = `
    SELECT * FROM logs ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ?
  `;
  const logs = db.prepare(selectQuery).all([...params, limit]) as any[];

  const filteredLogs: ParsedLogEntry[] = logs.map(row => ({
    id: row.id,
    timestamp: row.timestamp,
    level: row.level,
    message: row.message,
    source: row.source,
    format: row.format,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    status_code: row.status_code,
    request_method: row.request_method,
    request_path: row.request_path,
    response_size: row.response_size,
    duration_ms: row.duration_ms,
    raw_data: row.raw_data,
    parsed_at: row.parsed_at,
  }));

  return {
    logs: filteredLogs,
    total_count: totalCount,
    filtered_count: filteredLogs.length,
    time_range: {
      start: startTime.toISOString(),
      end: endTime.toISOString(),
    },
  };
}

/**
 * Get logs by error type
 */
export async function getLogsByErrorType(
  errorType: string,
  limit: number = 100
): Promise<ParsedLogEntry[]> {
  if (!env.persistenceEnabled) {
    return [];
  }

  const db = getDatabase();
  const query = `
    SELECT l.* FROM logs l
    JOIN errors e ON l.id = e.log_id
    WHERE e.error_type = ?
    ORDER BY l.timestamp DESC
    LIMIT ?
  `;

  const logs = db.prepare(query).all(errorType, limit) as any[];
  return logs.map(log => ({
    id: log.id,
    timestamp: log.timestamp,
    level: log.level,
    message: log.message,
    source: log.source,
    format: log.format,
    ip_address: log.ip_address,
    user_agent: log.user_agent,
    status_code: log.status_code,
    request_method: log.request_method,
    request_path: log.request_path,
    response_size: log.response_size,
    duration_ms: log.duration_ms,
    raw_data: log.raw_data,
    parsed_at: log.parsed_at,
  }));
}

/**
 * Get recent errors
 */
export async function getRecentErrors(hours: number = 24, limit: number = 100): Promise<any[]> {
  if (!env.persistenceEnabled) {
    return [];
  }

  const db = getDatabase();
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const query = `
    SELECT error_type, error_message, severity, COUNT(*) as count,
           MIN(first_seen) as first_seen, MAX(last_seen) as last_seen
    FROM errors
    WHERE last_seen >= ?
    GROUP BY error_type, error_message, severity
    ORDER BY count DESC, last_seen DESC
    LIMIT ?
  `;

  return db.prepare(query).all(startTime, limit);
}

/**
 * Get statistics for logs
 */
export async function getLogStats(timeRange?: { start: string; end: string }): Promise<any> {
  if (!env.persistenceEnabled) {
    return {
      total_logs: { count: 0 },
      by_level: [],
      by_source: [],
      by_status_code: [],
      unique_ips: { count: 0 },
    };
  }

  const db = getDatabase();
  let whereClause = '';
  const params: any[] = [];

  if (timeRange) {
    whereClause = 'WHERE timestamp >= ? AND timestamp <= ?';
    params.push(timeRange.start, timeRange.end);
  }

  const stats = {
    total_logs: db.prepare(`SELECT COUNT(*) as count FROM logs ${whereClause}`).get(params) as { count: number },
    by_level: db.prepare(`
      SELECT level, COUNT(*) as count FROM logs ${whereClause}
      GROUP BY level
    `).all(params),
    by_source: db.prepare(`
      SELECT source, COUNT(*) as count FROM logs ${whereClause}
      GROUP BY source
    `).all(params),
    by_status_code: db.prepare(`
      SELECT status_code, COUNT(*) as count FROM logs ${whereClause}
      WHERE status_code IS NOT NULL
      GROUP BY status_code
      ORDER BY count DESC
    `).all(params),
    unique_ips: db.prepare(`
      SELECT COUNT(DISTINCT ip_address) as count FROM logs ${whereClause}
      WHERE ip_address IS NOT NULL
    `).get(params) as { count: number },
  };

  return stats;
}

/**
 * Clear all logs (useful for testing)
 */
export function clearLogs(): number {
  if (!env.persistenceEnabled) {
    return 0;
  }

  const db = getDatabase();
  const result = db.prepare('DELETE FROM logs').run();
  db.prepare('DELETE FROM errors').run();
  return result.changes;
}

export default {
  storeLogs,
  fetchLogs,
  getLogsByErrorType,
  getRecentErrors,
  getLogStats,
  clearLogs,
};
