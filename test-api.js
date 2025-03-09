// Simple test script to verify API endpoints are working with pure functions
const axios = require('axios');

// Test YouTube URL
const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

// Test all API endpoints
async function testApiEndpoints() {
  console.log('Testing API endpoints...');
  
  try {
    // Test check-cache endpoint
    console.log('\nTesting check-cache endpoint:');
    const checkCacheResponse = await axios.post('http://localhost:3000/api/check-cache', {
      youtubeUrl: testUrl
    });
    console.log('check-cache response:', checkCacheResponse.data);

    // Test estimate endpoint
    console.log('\nTesting estimate endpoint:');
    const estimateResponse = await axios.post('http://localhost:3000/api/estimate', {
      youtubeUrl: testUrl,
      skipCache: true
    });
    console.log('estimate response:', estimateResponse.data);

    // Test summarize endpoint
    console.log('\nTesting summarize endpoint:');
    const summarizeResponse = await axios.post('http://localhost:3000/api/summarize', {
      youtubeUrl: testUrl,
      skipCache: true
    });
    console.log('summarize response:', summarizeResponse.data);

    // Test models endpoint
    console.log('\nTesting models endpoint:');
    const modelsResponse = await axios.get('http://localhost:3000/api/models');
    console.log('models response:', modelsResponse.data);

    // Test currencies endpoint
    console.log('\nTesting currencies endpoint:');
    const currenciesResponse = await axios.get('http://localhost:3000/api/currencies');
    console.log('currencies response:', currenciesResponse.data);

    console.log('\nAll API endpoints tested successfully!');
  } catch (error) {
    console.error('Error testing API endpoints:', error.response?.data || error.message);
  }
}

// Run the tests
testApiEndpoints();
