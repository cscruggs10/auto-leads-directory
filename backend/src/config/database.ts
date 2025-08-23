import { Pool } from 'pg';
import dotenv from 'dotenv';
import { query as mockQuery } from './mock-database';

dotenv.config();

// Use mock database for development
const useMockDatabase = !process.env.DATABASE_URL || process.env.USE_MOCK_DB === 'true';

let pool: Pool | null = null;

if (!useMockDatabase) {
  // Parse DATABASE_URL manually to handle Railway's connection string
  const dbUrl = process.env.DATABASE_URL;
  const match = dbUrl?.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  
  if (match) {
    const [, user, password, host, port, database] = match;
    
    pool = new Pool({
      user,
      password,
      host,
      port: parseInt(port),
      database,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: false
      },
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    });
    
    console.log(`🔌 Connecting to PostgreSQL: ${user}@${host}:${port}/${database}`);
  } else {
    // Fallback to connection string
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle database client', err);
  });
  
  // Test the connection on startup with retry
  const testConnection = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const client = await pool!.connect();
        console.log('✅ Successfully connected to PostgreSQL database');
        
        // Run a simple query to wake up the database
        const result = await client.query('SELECT NOW() as current_time');
        console.log(`🕐 Database time: ${result.rows[0].current_time}`);
        
        client.release();
        return;
      } catch (err: any) {
        console.error(`❌ Connection attempt ${i + 1}/${retries} failed:`, err.message);
        if (i < retries - 1) {
          console.log('⏳ Retrying in 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    console.error('❌ All connection attempts failed. Database may be sleeping.');
  };
  
  testConnection();
}

// Mock pool interface
const mockPool = {
  query: mockQuery,
  connect: async () => ({ release: () => {} }),
  end: async () => {},
  on: () => {}
};

export default useMockDatabase ? mockPool : pool!