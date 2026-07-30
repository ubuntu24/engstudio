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

// ─── Initialize ───────────────────────────────────────────────────────────────
if (isPostgres) {
  const { Pool } = require('pg');
  // For Node.js pg, Transaction mode (6543) can cause statement timeouts with extended query protocol.
  // Switch to Session mode (5432) for stable long-lived connections.
  const sessionUrl = supabaseUrl.replace(':6543/', ':5432/');
  pool = new Pool({
    connectionString: sessionUrl,
    ssl: { rejectUnauthorized: false },   // Required for Supabase
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
    idleTimeoutMillis: 10000
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

// ─── sql.js (sync) helpers ────────────────────────────────────────────────────
function _sqliteAll(sql, params) {
  const stmt = sqliteDb.prepare(sql);
  const rows = [];
  stmt.bind(params || []);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function _sqliteGet(sql, params) {
  const stmt = sqliteDb.prepare(sql);
  stmt.bind(params || []);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function _sqliteRun(sql, params) {
  sqliteDb.run(sql, params || []);
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
