/**
 * Manual test script for cost approval threshold feature
 * 
 * This script allows testing the cost approval threshold feature by:
 * 1. Setting different threshold values
 * 2. Simulating cost estimates above and below the threshold
 * 3. Verifying the requiresApproval flag is set correctly
 */

const path = require('path');
const fs = require('fs');
const config = require('../src/config');
const TranscriptSummarizer = require('../src/core/services/transcript-summarizer');

// Test function to check if approval is required based on cost
async function testCostApprovalThreshold(costValue, threshold) {
  // Save original threshold
  const originalThreshold = config.ai.costApprovalThreshold;
  
  try {
    // Set test threshold
    config.ai.costApprovalThreshold = threshold;
    console.log(`\nTest with cost: $${costValue.toFixed(4)}, threshold: $${threshold.toFixed(4)}`);
    
    // Create a mock estimate that would come from the API
    const mockEstimate = {
      model: 'test-model',
      totalCost: costValue,
      inputTokens: 1000,
      outputTokens: 200,
      currency: 'USD'
    };
    
    // Apply the same logic as in the API
    const requiresApproval = mockEstimate.totalCost > threshold;
    
    console.log(`Cost: $${mockEstimate.totalCost.toFixed(4)}`);
    console.log(`Threshold: $${threshold.toFixed(4)}`);
    console.log(`Requires approval: ${requiresApproval}`);
    console.log(`Expected behavior: ${requiresApproval ? 'Show approval dialog' : 'Skip approval dialog'}`);
    
    return requiresApproval;
  } finally {
    // Restore original threshold
    config.ai.costApprovalThreshold = originalThreshold;
  }
}

// Test with a real transcript if available
async function testWithRealTranscript(filePath, threshold) {
  // Save original threshold
  const originalThreshold = config.ai.costApprovalThreshold;
  
  try {
    // Set test threshold
    config.ai.costApprovalThreshold = threshold;
    
    console.log(`\nTest with real transcript from: ${filePath}`);
    console.log(`Threshold: $${threshold.toFixed(4)}`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return;
    }
    
    // Read transcript
    const transcript = fs.readFileSync(filePath, 'utf-8');
    
    // Create summarizer
    const summarizer = new TranscriptSummarizer({
      model: config.ai.model,
      currency: 'USD'
    });
    
    // Estimate cost
    const estimate = await summarizer.estimateCost(transcript);
    
    // Check if approval is required
    const requiresApproval = estimate.totalCost > threshold;
    
    console.log(`Model: ${estimate.model}`);
    console.log(`Input tokens: ${estimate.inputTokens.toLocaleString()}`);
    console.log(`Output tokens: ${estimate.outputTokens.toLocaleString()}`);
    console.log(`Total cost: $${estimate.totalCost.toFixed(4)}`);
    console.log(`Requires approval: ${requiresApproval}`);
    console.log(`Expected behavior: ${requiresApproval ? 'Show approval dialog' : 'Skip approval dialog'}`);
    
    return { estimate, requiresApproval };
  } finally {
    // Restore original threshold
    config.ai.costApprovalThreshold = originalThreshold;
  }
}

// Run tests
async function runTests() {
  console.log('=== Cost Approval Threshold Tests ===');
  console.log(`Current threshold in config: $${config.ai.costApprovalThreshold.toFixed(4)}`);
  
  // Test 1: Cost below threshold
  await testCostApprovalThreshold(0.03, 0.05);
  
  // Test 2: Cost equal to threshold
  await testCostApprovalThreshold(0.05, 0.05);
  
  // Test 3: Cost above threshold
  await testCostApprovalThreshold(0.07, 0.05);
  
  // Test 4: Very low threshold
  await testCostApprovalThreshold(0.01, 0.005);
  
  // Test 5: Very high threshold
  await testCostApprovalThreshold(0.5, 1.0);
  
  // Test with real transcript if available
  const outputDir = path.join(__dirname, '..', 'output');
  const files = fs.existsSync(outputDir) ? fs.readdirSync(outputDir) : [];
  const transcriptFiles = files.filter(file => file.endsWith('-transcript-with-chapters.txt'));
  
  if (transcriptFiles.length > 0) {
    const testFile = path.join(outputDir, transcriptFiles[0]);
    await testWithRealTranscript(testFile, 0.05);
    await testWithRealTranscript(testFile, 0.5); // Higher threshold
  } else {
    console.log('\nNo transcript files found for real-world testing');
  }
}

// Run all tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
