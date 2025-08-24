const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:aTEiNcPKJNFyJNZWZYoShDWayQSUrCjz@autorack.proxy.rlwy.net:53000/railway',
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0]);
    
    const dealerResult = await pool.query('SELECT id, name FROM dealers WHERE name = $1', ['Car Choice']);
    console.log('✅ Car Choice dealer:', dealerResult.rows[0] || 'NOT FOUND');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
}

testConnection();