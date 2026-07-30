const { dbQueryAll } = require('./utils/db.js');
async function run() {
  try {
      let newSql = `
        SELECT v.* FROM vocabulary v
        WHERE v.id NOT IN (SELECT word_id FROM learning_progress WHERE user_id = $1)
      `;
      let newParams = [1];
      newSql += ` AND v.video_id IS NOT NULL AND v.video_id != ''`;
      newParams.push(20);
      newSql += ` ORDER BY RANDOM() LIMIT $${newParams.length}`;
      console.log(newSql);
      const res = await dbQueryAll(newSql, newParams);
      console.log('Result:', res.length);
      process.exit(0);
  } catch (e) {
      console.error(e);
      process.exit(1);
  }
}
run();
