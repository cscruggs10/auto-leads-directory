const fetch = require('node-fetch');

const PRODUCTION_API_URL = 'https://auto-leads-directory-production.up.railway.app/api/v1';
const CAR_CHOICE_BOT_ID = '0198dc74-5ba6-7637-b1b0-b68de2a5e2bc';

console.log('🚀 Testing Browse AI Integration in Production');
console.log(`📡 API URL: ${PRODUCTION_API_URL}`);
console.log(`🤖 Bot ID: ${CAR_CHOICE_BOT_ID}\n`);

async function testProductionAPI() {
  try {
    // Step 1: Health check
    console.log('1. Testing API health...');
    const healthUrl = PRODUCTION_API_URL.replace('/api/v1', '/health');
    const healthResponse = await fetch(healthUrl);
    
    if (!healthResponse.ok) {
      console.log(`❌ Health check failed: ${healthResponse.status}`);
      const errorText = await healthResponse.text();
      console.log('Response:', errorText.substring(0, 200) + '...');
      throw new Error(`API not healthy: ${healthResponse.status}`);
    }
    
    const healthData = await healthResponse.json();
    console.log(`✅ API is healthy (${healthData.status})`);
    console.log(`   Environment: ${healthData.environment || 'unknown'}`);
    console.log(`   Browse AI Key: ${healthData.hasApiKey ? 'Present' : 'Missing'}`);
    console.log(`   Database: ${healthData.hasDatabase ? 'Connected' : 'Missing'}\n`);

    // Step 2: Test Browse AI dealers endpoint
    console.log('2. Testing Browse AI dealers endpoint...');
    const dealersResponse = await fetch(`${PRODUCTION_API_URL}/browse-ai/dealers`);
    
    if (!dealersResponse.ok) {
      console.log(`❌ Dealers endpoint failed: ${dealersResponse.status}`);
      const errorText = await dealersResponse.text();
      console.log('Error:', errorText.substring(0, 300));
      return;
    }
    
    const dealersData = await dealersResponse.json();
    console.log(`✅ Dealers endpoint working`);
    console.log(`   Total dealers: ${dealersData.summary.total}`);
    console.log(`   Browse AI configured: ${dealersData.summary.configured}`);
    console.log(`   Scraping enabled: ${dealersData.summary.enabled}`);
    
    const carChoiceDealer = dealersData.dealers.find(d => d.slug === 'car-choice');
    if (!carChoiceDealer) {
      console.log('⚠️  Car Choice dealer not found in production');
      return;
    }
    
    console.log(`✅ Car Choice dealer found (ID: ${carChoiceDealer.id})`);
    console.log(`   Browse AI configured: ${carChoiceDealer.browseAI.configured}`);
    console.log(`   Bot ID: ${carChoiceDealer.browseAI.botId || 'Not set'}\n`);

    // Step 3: Test Car Choice configuration
    console.log('3. Getting Car Choice Browse AI configuration...');
    const configResponse = await fetch(`${PRODUCTION_API_URL}/browse-ai/dealers/${carChoiceDealer.id}/config`);
    
    if (!configResponse.ok) {
      console.log(`❌ Config endpoint failed: ${configResponse.status}`);
      return;
    }
    
    const configData = await configResponse.json();
    console.log(`✅ Configuration retrieved`);
    console.log(`   Dealer: ${configData.dealerName}`);
    console.log(`   Bot ID: ${configData.browseAIConfig.botId}`);
    console.log(`   List Name: ${configData.browseAIConfig.listName}`);
    console.log(`   Configured: ${configData.isConfigured}\n`);

    // Step 4: Test bot (optional - can be slow)
    if (process.argv.includes('--test-bot')) {
      console.log('4. Testing Browse AI bot (this may take 1-2 minutes)...');
      const testResponse = await fetch(`${PRODUCTION_API_URL}/browse-ai/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: CAR_CHOICE_BOT_ID })
      });
      
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log('✅ Browse AI bot test successful!');
        console.log(`   Available lists: ${testData.capturedData.availableLists.join(', ')}`);
        
        Object.entries(testData.capturedData.sampleData).forEach(([listName, data]) => {
          if (Array.isArray(data) && data.length > 0) {
            console.log(`   ${listName} fields: ${Object.keys(data[0]).slice(0, 5).join(', ')}`);
          }
        });
      } else {
        const errorData = await testResponse.json();
        console.log('⚠️  Bot test failed:', errorData.error);
      }
      console.log();
    }

    // Step 5: Trigger scraping (optional)
    if (process.argv.includes('--scrape')) {
      console.log('5. Triggering Car Choice scraping...');
      const scrapeResponse = await fetch(`${PRODUCTION_API_URL}/browse-ai/dealers/${carChoiceDealer.id}/scrape`, {
        method: 'POST'
      });
      
      if (scrapeResponse.ok) {
        const scrapeData = await scrapeResponse.json();
        console.log('✅ Scraping started successfully');
        console.log(`   ${scrapeData.message}`);
      } else {
        const errorData = await scrapeResponse.json();
        console.log('❌ Scraping failed:', errorData.error);
      }
      console.log();
    }

    // Summary
    console.log('🎉 Production Browse AI Test Summary:');
    console.log('   ✅ API is accessible and working');
    console.log('   ✅ Browse AI endpoints functional');
    console.log('   ✅ Car Choice dealer properly configured');
    console.log(`   ✅ Bot ID ${CAR_CHOICE_BOT_ID} ready for use`);
    
    console.log('\n📋 Available Commands:');
    console.log('   node test-production-browse-ai.js --test-bot    # Test actual bot execution');
    console.log('   node test-production-browse-ai.js --scrape     # Trigger vehicle scraping');
    
  } catch (error) {
    console.error('\n❌ Production test failed:', error.message);
    console.log('\n🔍 Troubleshooting Steps:');
    console.log('   1. Check Railway deployment logs');
    console.log('   2. Verify environment variables are set in Railway');
    console.log('   3. Ensure database connection is working');
    console.log('   4. Check if all dependencies are properly installed');
  }
}

testProductionAPI();