#!/usr/bin/env node

const { ServerlessRunningStages } = require('@enterprise-cmcs/macpro-serverless-running-stages');

async function listRunningStages() {
  try {
    const region = process.env.REGION_A || 'us-east-1';
    console.log(`Checking running stages in region: ${region}`);
    
    const runningStages = await ServerlessRunningStages.getAllStagesForRegion(region);
    
    // Output in the same format as the original run command
    console.log(`runningStages=${runningStages.join(',')}`);
    
    // Additional human-readable output
    if (runningStages.length === 0) {
      console.log('No running stages found');
    } else {
      console.log(`\nFound ${runningStages.length} running stages:`);
      runningStages.forEach(stage => console.log(`  - ${stage}`));
    }
    
    // Set GitHub Actions output if running in CI
    if (process.env.GITHUB_OUTPUT) {
      const fs = require('fs');
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `stages=${runningStages.join(',')}\n`);
    }
    
    return runningStages;
  } catch (error) {
    console.error('Error listing running stages:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  listRunningStages();
}

module.exports = { listRunningStages }; 