import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import env from './env';

/**
 * SQLite Database Configuration
 * Zero-config local database for log storage and analysis results
 */

const DB_PATH = env.dbPath || path.join(__dirname, '../../data/logs.db');
const DATA_DIR = path.dirname(DB_PATH);

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 */
export function initDatabase() {
  // Logs table - stores parsed log entries
  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      level TEXT,
      message TEXT,
      source TEXT,
      format TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      status_code INTEGER,
      request_method TEXT,
      request_path TEXT,
      response_size INTEGER,
      duration_ms INTEGER,
      raw_data TEXT,
      parsed_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Analysis results table - stores AI analysis results
  db.exec(`
    CREATE TABLE IF NOT EXISTS analysis_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      intent_id TEXT NOT NULL,
      intent_class TEXT NOT NULL,
      total_logs_analyzed INTEGER,
      errors_found INTEGER,
      anomalies_detected INTEGER,
      findings TEXT,
      metrics JSON,
      analyzed_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Errors table - quick lookup for common errors
  db.exec(`
    CREATE TABLE IF NOT EXISTS errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_id INTEGER,
      error_type TEXT NOT NULL,
      error_message TEXT,
      severity TEXT,
      count INTEGER DEFAULT 1,
      first_seen TEXT,
      last_seen TEXT,
      FOREIGN KEY (log_id) REFERENCES logs(id)
    );
  `);

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
    CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
    CREATE INDEX IF NOT EXISTS idx_errors_type ON errors(error_type);
  `);

  console.log('✅ Database initialized at:', DB_PATH);
}

/**
 * Get database statistics
 */
export function getDbStats() {
  const stats = {
    path: DB_PATH,
    logCount: db.prepare('SELECT COUNT(*) as count FROM logs').get() as { count: number },
    analysisCount: db.prepare('SELECT COUNT(*) as count FROM analysis_results').get() as { count: number },
    errorCount: db.prepare('SELECT COUNT(*) as count FROM errors').get() as { count: number },
    dbSize: fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0,
  };

  return stats;
}

/**
 * Clear all data (useful for testing)
 */
export function clearDatabase() {
  db.exec('DELETE FROM logs');
  db.exec('DELETE FROM analysis_results');
  db.exec('DELETE FROM errors');
  console.log('🗑️  Database cleared');
}

/**
 * Close database connection
 */
export function closeDatabase() {
  db.close();
  console.log('🔌 Database connection closed');
}

export default {
  db,
  initDatabase,
  getDbStats,
  clearDatabase,
  closeDatabase,
};
