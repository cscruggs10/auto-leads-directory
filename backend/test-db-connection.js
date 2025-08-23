const { Pool } = require('pg');

async function testConnection() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:iBGhAcFbKLFZTlgWQebTvpHzILJVDEJm@junction.proxy.rlwy.net:31244/railway',
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('Testing Railway database connection...');
    
    const client = await pool.connect();
    console.log('✅ Connected successfully!');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Query successful:', result.rows[0]);
    
    // Test if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📋 Tables found:', tables.rows.map(r => r.table_name));
    
    client.release();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await pool.end();
  }
}

testConnection();