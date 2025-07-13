/**
 * OpenAI Models Fetcher
 * Fetches and saves available models from OpenAI API to a JSON file
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface ModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  permission?: Record<string, unknown>[];
  root?: string;
  parent?: string | null;
}

interface ModelResponse {
  object: string;
  data: ModelInfo[];
}

interface SavedModelData {
  fetchedAt: string;
  totalModels: number;
  models: {
    all: ModelInfo[];
    chat: ModelInfo[];
    embedding: ModelInfo[];
    image: ModelInfo[];
    audio: ModelInfo[];
    other: ModelInfo[];
  };
  categorizedCounts: {
    chat: number;
    embedding: number;
    image: number;
    audio: number;
    other: number;
  };
}

async function fetchOpenAIModels(): Promise<ModelResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    console.log('Please add your OpenAI API key to .env.local file:');
    console.log('OPENAI_API_KEY=your_api_key_here');
    return null;
  }

  try {
    console.log('🔄 Connecting to OpenAI API...');
    const openai = new OpenAI({ apiKey });
    
    console.log('📡 Fetching available models...');
    const response = await openai.models.list();
    
    console.log(`✅ Successfully fetched ${response.data.length} models`);
    return response;
    
  } catch (error) {
    console.error('❌ Error fetching models from OpenAI API:');
    if (error instanceof Error) {
      console.error('Message:', error.message);
      if ('status' in error && typeof (error as Record<string, unknown>).status === 'number') {
        console.error('Status:', (error as Record<string, unknown>).status);
      }
    }
    return null;
  }
}

function categorizeModels(models: ModelInfo[]) {
  const categories = {
    chat: [] as ModelInfo[],
    embedding: [] as ModelInfo[],
    image: [] as ModelInfo[],
    audio: [] as ModelInfo[],
    other: [] as ModelInfo[]
  };

  models.forEach(model => {
    const modelId = model.id.toLowerCase();
    
    if (modelId.includes('gpt') || modelId.includes('chat') || modelId.includes('turbo')) {
      categories.chat.push(model);
    } else if (modelId.includes('embedding') || modelId.includes('ada')) {
      categories.embedding.push(model);
    } else if (modelId.includes('dall-e') || modelId.includes('image')) {
      categories.image.push(model);
    } else if (modelId.includes('whisper') || modelId.includes('tts') || modelId.includes('audio')) {
      categories.audio.push(model);
    } else {
      categories.other.push(model);
    }
  });

  return categories;
}

function displayModelsSummary(data: SavedModelData) {
  console.log('\n📊 Models Summary:');
  console.log(`   Total Models: ${data.totalModels}`);
  console.log(`   Chat Models: ${data.categorizedCounts.chat}`);
  console.log(`   Embedding Models: ${data.categorizedCounts.embedding}`);
  console.log(`   Image Models: ${data.categorizedCounts.image}`);
  console.log(`   Audio Models: ${data.categorizedCounts.audio}`);
  console.log(`   Other Models: ${data.categorizedCounts.other}`);

  console.log('\n🤖 Chat Models:');
  data.models.chat.forEach(model => {
    console.log(`   • ${model.id} (${model.owned_by})`);
  });

  console.log('\n🔗 Embedding Models:');
  data.models.embedding.forEach(model => {
    console.log(`   • ${model.id} (${model.owned_by})`);
  });

  console.log('\n🎨 Image Models:');
  data.models.image.forEach(model => {
    console.log(`   • ${model.id} (${model.owned_by})`);
  });

  console.log('\n🎵 Audio Models:');
  data.models.audio.forEach(model => {
    console.log(`   • ${model.id} (${model.owned_by})`);
  });

  if (data.models.other.length > 0) {
    console.log('\n📦 Other Models:');
    data.models.other.forEach(model => {
      console.log(`   • ${model.id} (${model.owned_by})`);
    });
  }
}

async function saveModelsToFile(models: ModelResponse, outputPath: string) {
  const categorized = categorizeModels(models.data);
  
  const data: SavedModelData = {
    fetchedAt: new Date().toISOString(),
    totalModels: models.data.length,
    models: {
      all: models.data,
      ...categorized
    },
    categorizedCounts: {
      chat: categorized.chat.length,
      embedding: categorized.embedding.length,
      image: categorized.image.length,
      audio: categorized.audio.length,
      other: categorized.other.length
    }
  };

  try {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save to JSON file
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`💾 Models data saved to: ${outputPath}`);
    
    // Display summary
    displayModelsSummary(data);
    
    return data;
  } catch (error) {
    console.error('❌ Error saving models to file:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 OpenAI Models Fetcher\n');
  
  // Default output path
  const defaultOutputPath = path.join(process.cwd(), 'data', 'openai-models.json');
  
  // Check if custom output path was provided
  const customPath = process.argv[2];
  const outputPath = customPath || defaultOutputPath;
  
  console.log(`Output file: ${outputPath}\n`);
  
  try {
    // Fetch models from OpenAI API
    const modelsResponse = await fetchOpenAIModels();
    
    if (!modelsResponse) {
      console.log('❌ Failed to fetch models. Exiting.');
      process.exit(1);
    }
    
    // Save models to file
    await saveModelsToFile(modelsResponse, outputPath);
    
    console.log('\n✅ Successfully completed fetching and saving OpenAI models!');
    
  } catch (error) {
    console.error('\n❌ Script execution failed:', error);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export { fetchOpenAIModels, categorizeModels, saveModelsToFile };
