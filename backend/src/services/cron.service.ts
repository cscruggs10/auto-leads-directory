import cron from 'node-cron';
import { scrapeAllDealers } from './scraper.service';

let scrapingJob: cron.ScheduledTask | null = null;

export function setupCronJobs(): void {
  const schedule = process.env.SCRAPING_SCHEDULE || '0 2 * * *'; // Default: 2 AM daily
  
  console.log(`Setting up cron job for scraping with schedule: ${schedule}`);
  
  // Schedule scraping job
  scrapingJob = cron.schedule(schedule, async () => {
    console.log(`[${new Date().toISOString()}] Starting scheduled scraping...`);
    
    try {
      await scrapeAllDealers();
      console.log(`[${new Date().toISOString()}] Scheduled scraping completed successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Scheduled scraping failed:`, error);
    }
  });
  
  console.log('Cron jobs initialized successfully');
}

export function stopCronJobs(): void {
  if (scrapingJob) {
    scrapingJob.stop();
    console.log('Cron jobs stopped');
  }
}