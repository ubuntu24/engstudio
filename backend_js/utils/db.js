/**
 * db.js - Database abstraction layer
 *
 * - Production (Docker): Uses SUPABASE_URL (PostgreSQL via `pg`)
 * - Local dev:           Uses DB_PATH (SQLite via `sql.js` - no native bindings)
 */
const path = require('path');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const dbPath = process.env.DB_PATH;

const isPostgres = !!(supabaseUrl && (supabaseUrl.startsWith('postgres://') || supabaseUrl.startsWith('postgresql://')));

let pool = null;       // pg Pool (Postgres/Supabase)
let sqliteDb = null;   // sql.js Database (local SQLite)

console.log(`[db] Mode: ${isPostgres ? 'PostgreSQL (Supabase)' : 'SQLite'}`);

// ─── Initialize ───────────────────────────────────────────────────────────────
if (isPostgres) {
  const { Pool } = require('pg');
  // For Node.js pg, Transaction mode (6543) can cause statement timeouts with extended query protocol.
  // Switch to Session mode (5432) for stable long-lived connections.
  const sessionUrl = supabaseUrl;
  pool = new Pool({
    connectionString: sessionUrl,
    ssl: { rejectUnauthorized: false },   // Required for Supabase
    max: 20,                              // Stay safely within Supabase connection pool limits
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
    idleTimeoutMillis: 30000
  });
  pool.on('error', (err) => {
    console.error('[db] ❌ PostgreSQL pool error:', err.message);
  });
  // Test connection and apply Supabase Postgres Best Practice indexes on startup
  pool.query('SELECT 1').then(async () => {
    console.log('[db] ✅ PostgreSQL connected successfully');
    try {
      // Schema updates
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS flashcard_xp_today INTEGER DEFAULT 0;');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_flashcard_date TEXT;');
      await pool.query('CREATE TABLE IF NOT EXISTS user_badges (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, badge_id TEXT NOT NULL, earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, badge_id));');

      // Supabase Postgres Best Practice: Indexes for high-frequency queries
      await pool.query('CREATE INDEX IF NOT EXISTS idx_vocab_topic ON vocabulary(topic);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_vocab_word ON vocabulary(word);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_lp_user_due ON learning_progress(user_id, due_date);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_lp_user_status ON learning_progress(user_id, status);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_lp_user_word ON learning_progress(user_id, word_id);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_review_log_user_date ON review_log(user_id, reviewed_at);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_grammar_category ON grammar_questions(category);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_news_created_at ON news_articles(created_at DESC);');
      console.log('[db] ✅ Supabase PostgreSQL indexes verified successfully');
    } catch (e) {
      console.warn('[db] Note on schema updates:', e.message);
    }
  }).catch(err => {
    console.error('[db] ❌ PostgreSQL connection failed:', err.message);
  });
} else {
  // sql.js: WebAssembly SQLite, no native bindings needed on any OS
  const initSqlJs = require('sql.js');
  let resolvedDbPath = dbPath;
  if (!resolvedDbPath || !resolvedDbPath.endsWith('.db')) {
    resolvedDbPath = path.join(__dirname, '../../database/english_learning.db');
  }

  global._sqliteInitPromise = initSqlJs().then(SQL => {
    if (fs.existsSync(resolvedDbPath)) {
      const buf = fs.readFileSync(resolvedDbPath);
      sqliteDb = new SQL.Database(buf);
    } else {
      sqliteDb = new SQL.Database();
    }
    sqliteDb._dbPath = resolvedDbPath;
    // Ensure all tables exist (idempotent)
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT DEFAULT '',
        display_name TEXT DEFAULT '',
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        flashcard_xp_today INTEGER DEFAULT 0,
        last_flashcard_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS vocabulary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        vietnamese_meaning TEXT DEFAULT '',
        pronunciation TEXT DEFAULT '',
        video_id TEXT DEFAULT '',
        timestamp_sec REAL DEFAULT 0,
        context TEXT DEFAULT '',
        video_title TEXT DEFAULT '',
        channel TEXT DEFAULT '',
        view_count INTEGER DEFAULT 0,
        embed_url TEXT DEFAULT '',
        definition TEXT DEFAULT '',
        example TEXT DEFAULT '',
        image_path TEXT DEFAULT '',
        audio_path TEXT DEFAULT '',
        pos TEXT DEFAULT '',
        example_vi TEXT DEFAULT '',
        topic TEXT DEFAULT 'Giao tiếp hàng ngày',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS learning_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1,
        word_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        ease_factor REAL NOT NULL DEFAULT 2.5,
        interval_days REAL NOT NULL DEFAULT 0,
        consecutive_correct INTEGER NOT NULL DEFAULT 0,
        due_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_reviewed TIMESTAMP,
        total_reviews INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, word_id)
      );
      CREATE TABLE IF NOT EXISTS review_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1,
        session_type TEXT NOT NULL DEFAULT 'learn',
        cards_seen INTEGER NOT NULL DEFAULT 0,
        cards_correct INTEGER NOT NULL DEFAULT 0,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS review_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        user_id INTEGER NOT NULL DEFAULT 1,
        word_id INTEGER NOT NULL,
        rating TEXT NOT NULL,
        response_time_ms INTEGER DEFAULT 0,
        reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS grammar_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        question TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        source TEXT DEFAULT 'ETS 2024',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        formula TEXT DEFAULT '',
        signal_words TEXT DEFAULT '',
        translation_vi TEXT DEFAULT '',
        ai_breakdown_json TEXT DEFAULT NULL
      );
      CREATE TABLE IF NOT EXISTS user_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1,
        badge_id TEXT NOT NULL,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, badge_id)
      );
    `);
    // Alter table if they already exist
    try { sqliteDb.run("ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0;"); } catch (_) {}
    try { sqliteDb.run("ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;"); } catch (_) {}
    
    // Persist the newly created schema
    try { fs.writeFileSync(resolvedDbPath, Buffer.from(sqliteDb.export())); } catch (_) {}
    console.log('[db] ✅ Using sql.js SQLite at:', resolvedDbPath);
    return sqliteDb;
  }).catch(err => {
    console.error('[db] ❌ sql.js init error:', err.message);
    process.exit(1);
  });

  const _persist = () => {
    if (sqliteDb && sqliteDb._dbPath) {
      try { fs.writeFileSync(sqliteDb._dbPath, Buffer.from(sqliteDb.export())); } catch (_) { }
    }
  };
  process.on('exit', _persist);
  process.on('SIGINT', () => { _persist(); process.exit(); });
  process.on('SIGTERM', () => { _persist(); process.exit(); });
}

// ─── Ensure sql.js init is complete before any query ─────────────────────────
async function ensureInit() {
  if (!isPostgres && global._sqliteInitPromise) {
    await global._sqliteInitPromise;
  }
}

// ─── Postgres SQL normalization ───────────────────────────────────────────────
function toPgSql(sql) {
  // INSERT OR IGNORE → INSERT ... ON CONFLICT DO NOTHING
  if (sql.includes('INSERT OR IGNORE')) {
    sql = sql.replace('INSERT OR IGNORE', 'INSERT');
    if (!sql.toUpperCase().includes('ON CONFLICT')) sql += ' ON CONFLICT DO NOTHING';
  }
  // ? → $1, $2 ...
  let i = 1;
  sql = sql.replace(/\?/g, () => `$${i++}`);
  return sql;
}

// ─── SQLite SQL normalization (converts $1/$2 back to ?) ──────────────────────
function toSqliteSql(sql) {
  // Convert $1, $2 ... → ?
  sql = sql.replace(/\$\d+/g, '?');
  // RETURNING id clause not supported by sql.js - strip it
  sql = sql.replace(/\s+RETURNING\s+\w+/gi, '');
  return sql;
}

// ─── sql.js (sync) helpers ────────────────────────────────────────────────────
function _sqliteAll(sql, params) {
  const stmt = sqliteDb.prepare(toSqliteSql(sql));
  const rows = [];
  stmt.bind(params || []);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function _sqliteGet(sql, params) {
  const stmt = sqliteDb.prepare(toSqliteSql(sql));
  stmt.bind(params || []);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function _sqliteRun(sql, params) {
  sqliteDb.run(toSqliteSql(sql), params || []);
  const lastIDRow = _sqliteGet('SELECT last_insert_rowid() as id', []);
  const changesRow = _sqliteGet('SELECT changes() as n', []);
  const lastID = lastIDRow ? Number(lastIDRow.id) : 0;
  const changes = changesRow ? Number(changesRow.n) : 0;
  // Persist to disk after every write
  if (sqliteDb._dbPath) {
    try { fs.writeFileSync(sqliteDb._dbPath, Buffer.from(sqliteDb.export())); } catch (_) { }
  }
  return { changes, lastID };
}

// ─── Public async API ─────────────────────────────────────────────────────────
async function dbQueryAll(sql, params = []) {
  await ensureInit();
  try {
    if (isPostgres) {
      const res = await pool.query(toPgSql(sql), params);
      return res.rows;
    }
    return _sqliteAll(sql, params);
  } catch (err) {
    console.error('[db] dbQueryAll error:', err.message, '\nSQL:', sql);
    throw err;
  }
}

async function dbQueryGet(sql, params = []) {
  await ensureInit();
  try {
    if (isPostgres) {
      const res = await pool.query(toPgSql(sql), params);
      return res.rows[0] || null;
    }
    return _sqliteGet(sql, params);
  } catch (err) {
    console.error('[db] dbQueryGet error:', err.message, '\nSQL:', sql);
    throw err;
  }
}

async function dbRun(sql, params = []) {
  await ensureInit();
  try {
    if (isPostgres) {
      let pgSql = toPgSql(sql);
      if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
        pgSql += ' RETURNING id';
      }
      const res = await pool.query(pgSql, params);
      const lastID = res.rows && res.rows[0] ? (res.rows[0].id || 0) : 0;
      return { changes: res.rowCount || 0, lastID };
    }
    return _sqliteRun(sql, params);
  } catch (err) {
    console.error('[db] dbRun error:', err.message, '\nSQL:', sql);
    throw err;
  }
}

module.exports = { dbQueryAll, dbQueryGet, dbRun, pool, sqliteDb };
