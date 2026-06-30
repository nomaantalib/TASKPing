require('dotenv').config();
const https = require('https');

function listModels() {
  const key = process.env.GEMINI_KEY_2;
  if (!key) {
    console.error('No GEMINI_KEY_2 found');
    return;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) {
          console.error('API Error:', parsed.error);
          return;
        }
        console.log('Available models for key suffix ...' + key.slice(-6));
        if (parsed.models) {
          parsed.models.forEach(m => {
            console.log(`- Name: ${m.name}, Display: ${m.displayName}`);
          });
        } else {
          console.log('No models returned in response:', parsed);
        }
      } catch (e) {
        console.error('Failed to parse response:', e.message);
        console.log('Raw data:', data);
      }
    });
  }).on('error', (err) => {
    console.error('Request failed:', err.message);
  });
}

listModels();
