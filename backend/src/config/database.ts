import { Pool } from 'pg';
import dotenv from 'dotenv';
import { query as mockQuery } from './mock-database';

dotenv.config();

// Use mock database for development
const useMockDatabase = !process.env.DATABASE_URL || process.env.USE_MOCK_DB === 'true';

let pool: Pool | null = null;

if (!useMockDatabase) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle database client', err);
  });
}

// Mock pool interface
const mockPool = {
  query: mockQuery,
  connect: async () => ({ release: () => {} }),
  end: async () => {},
  on: () => {}
};

export default useMockDatabase ? mockPool : pool!