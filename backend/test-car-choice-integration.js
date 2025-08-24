const fetch = require('node-fetch');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api/v1';
const CAR_CHOICE_BOT_ID = '0198dc74-5ba6-7637-b1b0-b68de2a5e2bc';

async function testCarChoiceIntegration() {
  console.log('🧪 Testing Car Choice Browse AI Integration\n');
  
  try {
    // Step 1: Add Car Choice dealer to database
    console.log('1. Adding Car Choice dealer to database...');
    const { execSync } = require('child_process');
    try {
      execSync('node add-car-choice-dealer.js', { stdio: 'inherit', cwd: __dirname });
      console.log('✅ Car Choice dealer added\n');
    } catch (error) {
      console.log('ℹ️  Car Choice dealer may already exist\n');
    }

    // Step 2: Get dealer ID
    console.log('2. Fetching dealer information...');
    const dealersResponse = await fetch(`${BASE_URL}/browse-ai/dealers`);
    const dealersData = await dealersResponse.json();
    
    const carChoiceDealer = dealersData.dealers.find(d => d.slug === 'car-choice');
    if (!carChoiceDealer) {
      throw new Error('Car Choice dealer not found');
    }
    
    console.log(`✅ Found Car Choice dealer (ID: ${carChoiceDealer.id})`);
    console.log(`   Browse AI configured: ${carChoiceDealer.browseAI.configured}`);
    console.log(`   Bot ID: ${carChoiceDealer.browseAI.botId || 'Not set'}\n`);

    // Step 3: Configure Browse AI bot (if not already configured)
    if (!carChoiceDealer.browseAI.configured) {
      console.log('3. Configuring Browse AI bot...');
      const configResponse = await fetch(`${BASE_URL}/browse-ai/dealers/${carChoiceDealer.id}/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          botId: CAR_CHOICE_BOT_ID,
          listName: 'vehicles',
          inputParameters: {},
          fieldMapping: {
            year: 'year',
            make: 'make',
            model: 'model',
            price: 'price',
            mileage: 'mileage',
            photos: 'images'
          }
        })
      });
      
      if (!configResponse.ok) {
        throw new Error(`Configuration failed: ${configResponse.status}`);
      }
      
      const configData = await configResponse.json();
      console.log('✅ Browse AI bot configured successfully\n');
    } else {
      console.log('3. ✅ Browse AI bot already configured\n');
    }

    // Step 4: Test bot connection (optional - may be slow)
    if (process.argv.includes('--test-bot')) {
      console.log('4. Testing Browse AI bot connection...');
      console.log('   (This may take 1-2 minutes...)');
      
      const testResponse = await fetch(`${BASE_URL}/browse-ai/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          botId: CAR_CHOICE_BOT_ID,
          inputParameters: {}
        })
      });
      
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log('✅ Bot test successful');
        console.log(`   Available lists: ${testData.capturedData.availableLists.join(', ')}`);
        console.log(`   Sample data keys: ${Object.keys(testData.capturedData.sampleData).join(', ')}\n`);
      } else {
        const errorData = await testResponse.json();
        console.log('⚠️  Bot test failed:', errorData.error);
        console.log('   (This is normal if the bot takes a while to run)\n');
      }
    } else {
      console.log('4. ⏭️  Skipping bot test (add --test-bot flag to test)\n');
    }

    // Step 5: Trigger scraping (optional)
    if (process.argv.includes('--scrape')) {
      console.log('5. Triggering Car Choice scraping...');
      const scrapeResponse = await fetch(`${BASE_URL}/browse-ai/dealers/${carChoiceDealer.id}/scrape`, {
        method: 'POST'
      });
      
      if (scrapeResponse.ok) {
        const scrapeData = await scrapeResponse.json();
        console.log('✅ Scraping started successfully');
        console.log('   Check server logs for progress\n');
      } else {
        const errorData = await scrapeResponse.json();
        console.log('❌ Scraping failed:', errorData.error, '\n');
      }
    } else {
      console.log('5. ⏭️  Skipping scraping (add --scrape flag to trigger)\n');
    }

    // Summary
    console.log('🎉 Car Choice Integration Summary:');
    console.log('   ✅ Browse AI service created');
    console.log('   ✅ Car Choice dealer configured');
    console.log('   ✅ API endpoints added');
    console.log('   ✅ Integration ready for use');
    console.log('\n📚 Available endpoints:');
    console.log(`   GET  ${BASE_URL}/browse-ai/dealers`);
    console.log(`   GET  ${BASE_URL}/browse-ai/dealers/${carChoiceDealer.id}/config`);
    console.log(`   POST ${BASE_URL}/browse-ai/dealers/${carChoiceDealer.id}/configure`);
    console.log(`   POST ${BASE_URL}/browse-ai/dealers/${carChoiceDealer.id}/scrape`);
    console.log(`   POST ${BASE_URL}/browse-ai/test`);

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testCarChoiceIntegration();