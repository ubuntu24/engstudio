require('dotenv').config({ path: '../.env' }); 
const { dbQueryAll } = require('./utils/db'); 

async function run() {
  try {
    const q1 = await dbQueryAll(`
        EXPLAIN ANALYZE 
        SELECT v.* 
        FROM vocabulary v 
        JOIN learning_progress lp ON lp.word_id = v.id 
        WHERE lp.user_id = 1 
          AND lp.due_date <= '2026-12-31' 
          AND lp.status IN ('learning', 'reviewing', 'known') 
          AND v.video_id IS NOT NULL 
          AND v.video_id != '' 
        ORDER BY lp.due_date ASC 
        LIMIT 20
    `);
    console.log('--- Review Query ---');
    console.log(q1.map(r => r['QUERY PLAN']).join('\n'));

    const q2 = await dbQueryAll(`
        EXPLAIN ANALYZE 
        SELECT v.* 
        FROM vocabulary v 
        WHERE v.id NOT IN (
            SELECT word_id FROM learning_progress WHERE user_id = 1
        ) 
        AND v.video_id IS NOT NULL 
        AND v.video_id != '' 
        ORDER BY RANDOM() 
        LIMIT 20
    `);
    console.log('--- New Word Query ---');
    console.log(q2.map(r => r['QUERY PLAN']).join('\n'));
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
