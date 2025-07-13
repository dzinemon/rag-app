/**
 * OpenAI Models Utility
 * Provides helpful utilities for working with OpenAI models data
 */

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

class OpenAIModelsUtil {
  private dataPath: string;
  private data: SavedModelData | null = null;

  constructor(dataPath?: string) {
    this.dataPath = dataPath || path.join(process.cwd(), 'data', 'openai-models.json');
  }

  /**
   * Load models data from file
   */
  private loadData(): SavedModelData {
    if (this.data) {
      return this.data;
    }

    if (!fs.existsSync(this.dataPath)) {
      throw new Error(`Models data file not found at: ${this.dataPath}\nRun 'yarn fetch:openai-models' first.`);
    }

    try {
      const rawData = fs.readFileSync(this.dataPath, 'utf-8');
      this.data = JSON.parse(rawData);
      return this.data!;
    } catch (error) {
      throw new Error(`Failed to parse models data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all models by category
   */
  getModelsByCategory(category: 'chat' | 'embedding' | 'image' | 'audio' | 'other' | 'all'): ModelInfo[] {
    const data = this.loadData();
    return data.models[category];
  }

  /**
   * Find models matching a pattern
   */
  findModels(pattern: string | RegExp): ModelInfo[] {
    const data = this.loadData();
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    
    return data.models.all.filter(model => regex.test(model.id));
  }

  /**
   * Get the newest models in each category
   */
  getNewestModels(): Record<string, ModelInfo> {
    const data = this.loadData();
    const newest: Record<string, ModelInfo> = {};

    for (const [category, models] of Object.entries(data.models)) {
      if (category === 'all' || models.length === 0) continue;
      
      const sortedModels = [...models].sort((a, b) => b.created - a.created);
      newest[category] = sortedModels[0];
    }

    return newest;
  }

  /**
   * Compare current app configuration with available models
   */
  compareWithCurrentConfig(): {
    current: Record<string, string | undefined>;
    available: Record<string, ModelInfo[]>;
    recommendations: string[];
  } {
    const data = this.loadData();
    
    const current = {
      chat: process.env.OPENAI_CHAT_MODEL,
      embedding: process.env.OPENAI_EMBEDDING_MODEL
    };

    const available = {
      chat: data.models.chat,
      embedding: data.models.embedding,
    };

    const recommendations: string[] = [];

    // Check if current models exist
    const currentChatExists = available.chat.some(m => m.id === current.chat);
    const currentEmbeddingExists = available.embedding.some(m => m.id === current.embedding);

    if (!currentChatExists) {
      recommendations.push(`⚠️  Chat model '${current.chat}' not found in available models`);
    }

    if (!currentEmbeddingExists) {
      recommendations.push(`⚠️  Embedding model '${current.embedding}' not found in available models`);
    }

    // Suggest newer models
    const newestChat = available.chat.sort((a, b) => b.created - a.created)[0];
    const newestEmbedding = available.embedding.sort((a, b) => b.created - a.created)[0];

    if (newestChat && newestChat.id !== current.chat) {
      recommendations.push(`💡 Consider upgrading to newer chat model: '${newestChat.id}'`);
    }

    if (newestEmbedding && newestEmbedding.id !== current.embedding) {
      recommendations.push(`💡 Consider upgrading to newer embedding model: '${newestEmbedding.id}'`);
    }

    return { current, available, recommendations };
  }

  /**
   * Display data summary
   */
  displaySummary(): void {
    const data = this.loadData();
    
    console.log('📊 OpenAI Models Summary');
    console.log(`   Data fetched: ${new Date(data.fetchedAt).toLocaleString()}`);
    console.log(`   Total models: ${data.totalModels}`);
    console.log();

    for (const [category, count] of Object.entries(data.categorizedCounts)) {
      console.log(`   ${category.charAt(0).toUpperCase() + category.slice(1)} Models: ${count}`);
    }
    console.log();
  }

  /**
   * List models by category with details
   */
  listModels(category: 'chat' | 'embedding' | 'image' | 'audio' | 'other' = 'chat', limit?: number): void {
    const models = this.getModelsByCategory(category);
    const displayModels = limit ? models.slice(0, limit) : models;

    console.log(`🤖 ${category.charAt(0).toUpperCase() + category.slice(1)} Models:`);
    displayModels.forEach(model => {
      const date = new Date(model.created * 1000).toLocaleDateString();
      console.log(`   • ${model.id} (${model.owned_by}) - ${date}`);
    });
    
    if (limit && models.length > limit) {
      console.log(`   ... and ${models.length - limit} more`);
    }
    console.log();
  }

  /**
   * Show configuration recommendations
   */
  showRecommendations(): void {
    console.log('🔍 Analyzing current configuration...\n');
    
    const analysis = this.compareWithCurrentConfig();
    
    console.log('📋 Current Configuration:');
    console.log(`   Chat Model: ${analysis.current.chat}`);
    console.log(`   Embedding Model: ${analysis.current.embedding}`);
    console.log();

    if (analysis.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      analysis.recommendations.forEach(rec => console.log(`   ${rec}`));
      console.log();
    } else {
      console.log('✅ Current configuration looks good!\n');
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  const util = new OpenAIModelsUtil();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'summary':
        util.displaySummary();
        break;
        
      case 'chat':
        util.listModels('chat');
        break;
        
      case 'embedding':
        util.listModels('embedding');
        break;
        
      case 'image':
        util.listModels('image');
        break;
        
      case 'audio':
        util.listModels('audio');
        break;
        
      case 'check':
        util.showRecommendations();
        break;
        
      case 'find':
        const pattern = process.argv[3];
        if (!pattern) {
          console.log('❌ Please provide a search pattern: yarn models:util find "gpt-4"');
          process.exit(1);
        }
        const matches = util.findModels(pattern);
        console.log(`🔍 Models matching "${pattern}":`);
        matches.forEach(model => {
          const date = new Date(model.created * 1000).toLocaleDateString();
          console.log(`   • ${model.id} (${model.owned_by}) - ${date}`);
        });
        break;
        
      default:
        console.log('🔧 OpenAI Models Utility\n');
        console.log('Available commands:');
        console.log('   yarn models:util summary     - Show models summary');
        console.log('   yarn models:util chat        - List chat models');
        console.log('   yarn models:util embedding   - List embedding models');
        console.log('   yarn models:util image       - List image models');
        console.log('   yarn models:util audio       - List audio models');
        console.log('   yarn models:util check       - Check current configuration');
        console.log('   yarn models:util find <pattern> - Find models by pattern');
        console.log();
        console.log('Example: yarn models:util find "gpt-4o"');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { OpenAIModelsUtil };
