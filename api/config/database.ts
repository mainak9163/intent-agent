import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import env from './env';

/**
 * SQLite Database Configuration
 * Zero-config local database for log storage and analysis results
 */

const DB_PATH = env.dbPath || path.join(__dirname, '../../data/logs.db');
let db: Database.Database | null = null;

function ensurePersistenceEnabled() {
  if (!env.persistenceEnabled) {
    throw new Error('Persistence is disabled. Set ENABLE_PERSISTENCE=true to use SQLite storage.');
  }
}

function createDatabase(): Database.Database {
  const dataDir = path.dirname(DB_PATH);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const database = new Database(DB_PATH);
  database.pragma('journal_mode = WAL');
  return database;
}

export function getDatabase(): Database.Database {
  ensurePersistenceEnabled();

  if (!db) {
    db = createDatabase();
  }

  return db;
}

/**
 * Initialize database schema
 */
export function initDatabase() {
  if (!env.persistenceEnabled) {
    console.log('ℹ️  Persistence disabled; running in stateless mode');
    return;
  }

  const database = getDatabase();
  // Logs table - stores parsed log entries
  database.exec(`
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
  database.exec(`
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
  database.exec(`
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
  database.exec(`
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
  if (!env.persistenceEnabled) {
    return {
      path: null,
      persistenceEnabled: false,
      logCount: { count: 0 },
      analysisCount: { count: 0 },
      errorCount: { count: 0 },
      dbSize: 0,
    };
  }

  const database = getDatabase();
  const stats = {
    path: DB_PATH,
    persistenceEnabled: true,
    logCount: database.prepare('SELECT COUNT(*) as count FROM logs').get() as { count: number },
    analysisCount: database.prepare('SELECT COUNT(*) as count FROM analysis_results').get() as { count: number },
    errorCount: database.prepare('SELECT COUNT(*) as count FROM errors').get() as { count: number },
    dbSize: fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0,
  };

  return stats;
}

/**
 * Clear all data (useful for testing)
 */
export function clearDatabase() {
  if (!env.persistenceEnabled) {
    return;
  }

  const database = getDatabase();
  database.exec('DELETE FROM logs');
  database.exec('DELETE FROM analysis_results');
  database.exec('DELETE FROM errors');
  console.log('🗑️  Database cleared');
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (!db) {
    return;
  }

  db.close();
  db = null;
  console.log('🔌 Database connection closed');
}

export default {
  getDatabase,
  initDatabase,
  getDbStats,
  clearDatabase,
  closeDatabase,
};
