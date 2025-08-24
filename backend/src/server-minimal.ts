import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Minimal health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasApiKey: !!process.env.BROWSE_AI_API_KEY,
    hasDatabase: !!process.env.DATABASE_URL
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Auto Leads API - Minimal Version' });
});

app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Browse AI Key present: ${!!process.env.BROWSE_AI_API_KEY}`);
  console.log(`Database URL present: ${!!process.env.DATABASE_URL}`);
});