const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_URL || process.env.DB_PATH,
  ssl: { rejectUnauthorized: false } // Required for Supabase
});

function convertSqliteToPg(sql) {
  // Convert INSERT OR IGNORE
  if (sql.includes('INSERT OR IGNORE')) {
    sql = sql.replace('INSERT OR IGNORE', 'INSERT');
    if (!sql.includes('ON CONFLICT')) {
      sql += ' ON CONFLICT DO NOTHING';
    }
  }
  
  // Convert ? to $1, $2, etc. (only if we still have ? and haven't manually used $1)
  if (sql.includes('?')) {
    let i = 1;
    sql = sql.replace(/\?/g, () => `$${i++}`);
  }
  return sql;
}

async function dbQueryAll(sql, params = []) {
  sql = convertSqliteToPg(sql);
  try {
    const res = await pool.query(sql, params);
    return res.rows;
  } catch (err) {
    console.error('[backend_js] DB Query Error:', err.message, 'SQL:', sql);
    throw err;
  }
}

async function dbQueryGet(sql, params = []) {
  const rows = await dbQueryAll(sql, params);
  return rows[0] || null;
}

async function dbRun(sql, params = []) {
  sql = convertSqliteToPg(sql);
  try {
    const res = await pool.query(sql, params);
    // If lastID is needed, the caller MUST use RETURNING id in the SQL query.
    let lastID = 0;
    if (res.rows && res.rows.length > 0 && res.rows[0].id) {
      lastID = res.rows[0].id;
    }
    return { changes: res.rowCount || 0, lastID: lastID };
  } catch (err) {
    console.error('[backend_js] DB Run Error:', err.message, 'SQL:', sql);
    throw err;
  }
}

module.exports = {
  dbQueryAll,
  dbQueryGet,
  dbRun,
  pool
};
