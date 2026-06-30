require('dotenv').config();
const { parseNLTask, getEmbedding } = require('./services/gemini');
const mongoose = require('mongoose');

const runTest = async () => {
  console.log('=== TASKping Integration Tests ===');

  // 1. Test DB Connection
  console.log('\n[1/3] Testing MongoDB connection...');
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not set in environment variables');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully!');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
  }

  // 2. Test Gemini NLP Parsing
  console.log('\n[2/3] Testing Gemini NLP Task parsing...');
  try {
    const text = 'Finish coding the dashboard layout by tomorrow at 4 PM, effort 2.5 hours, category Work';
    console.log(`Parsing input text: "${text}"`);
    const parsed = await parseNLTask(text);
    console.log('✅ Gemini parsed output:');
    console.log(JSON.stringify(parsed, null, 2));
  } catch (err) {
    console.error('❌ Gemini NLP parsing failed:', err.message);
  }

  // 3. Test Gemini Embeddings
  console.log('\n[3/3] Testing Gemini Text Embeddings (RAG base)...');
  try {
    const text = 'Finish coding the dashboard layout';
    const embedding = await getEmbedding(text);
    console.log(`✅ Text embedding generated successfully! Dimension size: ${embedding.length}`);
    if (embedding.length > 0) {
      console.log(`Sample vector values (first 5): [${embedding.slice(0, 5).join(', ')}, ...]`);
    }
  } catch (err) {
    console.error('❌ Gemini text embeddings failed:', err.message);
  }

  console.log('\n=== Testing Finished. Shutting down connection ===');
  await mongoose.disconnect();
};

runTest();
