/**
 * Debug script to test the complete ingestion pipeline
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { KnowledgeBaseService } from '../src/services/knowledgeBaseService';
import { prisma } from '../src/lib/prisma';

async function testIngestionPipeline() {
  console.log('🧪 Testing complete ingestion pipeline...\n');

  try {
    // Initialize knowledge base service
    const kb = new KnowledgeBaseService();
    await kb.init();

    // Test 1: Add a simple document with content
    console.log('📄 Test 1: Adding document with direct content...');
    const doc1 = await kb.addDocument({
      title: 'Test Cash Flow Document',
      content: `
        Cash flow management is the process of tracking, analyzing, and optimizing the net amount of cash receipts minus cash expenses. 
        
        A cash flow statement is a financial statement that provides aggregate data regarding all cash inflows and outflows a company receives. 
        
        Effective cash flow management includes:
        - Monitoring cash inflows from sales and other revenue sources
        - Tracking cash outflows for expenses, inventory, and capital expenditures
        - Forecasting future cash positions
        - Maintaining adequate cash reserves for operations
        
        Poor cash flow management is one of the leading causes of business failure, especially for startups and small businesses.
      `,
      documentType: 'test_content',
      tags: ['cash flow', 'finance', 'management'],
      author: 'Test Author'
    });

    console.log(`✅ Document created: ${doc1.id} with ${doc1.chunks.length} chunks`);

    // Test 2: Verify data in PostgreSQL
    console.log('\n📊 Test 2: Verifying PostgreSQL data...');
    const docFromDB = await prisma.document.findUnique({
      where: { id: doc1.id },
      include: {
        chunks: {
          select: {
            id: true,
            chunkText: true,
            chunkNumber: true
          }
        }
      }
    });

    if (docFromDB) {
      console.log(`✅ Document found in PostgreSQL: ${docFromDB.title}`);
      console.log(`✅ Chunks in PostgreSQL: ${docFromDB.chunks.length}`);
      docFromDB.chunks.forEach((chunk, i) => {
        console.log(`   ${i + 1}. Chunk ID: ${chunk.id}, Length: ${chunk.chunkText.length} chars`);
      });
    } else {
      console.log('❌ Document not found in PostgreSQL');
    }

    // Test 3: Test retrieval
    console.log('\n🔍 Test 3: Testing retrieval...');
    const queries = [
      'cash flow management',
      'cash flow statement',
      'what is cash flow',
      'business failure causes'
    ];

    for (const query of queries) {
      console.log(`\n   Query: "${query}"`);
      const result = await kb.retrieveChunksForQuery(query, {
        topK: 3,
        threshold: 0.1 // Very low threshold for testing
      });

      console.log(`   Results: ${result.chunks.length} chunks`);
      result.chunks.forEach((chunk, i) => {
        console.log(`     ${i + 1}. Score: ${chunk.score.toFixed(3)}, Text: ${chunk.text.substring(0, 100)}...`);
      });
    }

    // Test 4: Add document from URL
    console.log('\n🌐 Test 4: Adding document from URL...');
    try {
      const doc2 = await kb.addDocument({
        title: 'Kruze Cash Flow Article',
        url: 'https://kruzeconsulting.com/blog/cash-flow-statement/',
        documentType: 'web_content',
        tags: ['cash flow', 'financial statements']
      });

      console.log(`✅ URL document created: ${doc2.id} with ${doc2.chunks.length} chunks`);

      // Test retrieval with new document
      console.log('\n🔍 Testing retrieval after URL ingestion...');
      const result2 = await kb.retrieveChunksForQuery('cash flow statement', {
        topK: 5,
        threshold: 0.1
      });

      console.log(`Found ${result2.chunks.length} chunks after URL ingestion`);
      result2.chunks.forEach((chunk, i) => {
        console.log(`  ${i + 1}. ${chunk.document.title} (score: ${chunk.score.toFixed(3)})`);
      });

    } catch (error) {
      console.error('❌ URL ingestion failed:', error);
    }

    await kb.close();
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testIngestionPipeline();
