const { execFile } = require('child_process');
const path = require('path');

function execBridge(sql, params = []) {
  return new Promise((resolve, reject) => {
    // db_bridge.py is in the parent directory relative to utils/
    const bridgePath = path.join(__dirname, '..', 'db_bridge.py');
    execFile('python3', [bridgePath, sql, JSON.stringify(params)], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(err);
      try {
        const res = JSON.parse(stdout);
        if (res.error) return reject(new Error(res.error));
        resolve(res);
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function dbQueryAll(sql, params = []) {
  const res = await execBridge(sql, params);
  return res.rows || [];
}

async function dbQueryGet(sql, params = []) {
  const res = await execBridge(sql, params);
  return (res.rows && res.rows[0]) || null;
}

async function dbRun(sql, params = []) {
  const res = await execBridge(sql, params);
  return { lastID: res.lastID || 0, changes: res.changes || 0 };
}

module.exports = {
  dbQueryAll,
  dbQueryGet,
  dbRun,
  execBridge
};
