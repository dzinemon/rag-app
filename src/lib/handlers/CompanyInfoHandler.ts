/**
 * Company Information Handler
 * Manages company-related question detection and response generation
 */

import fs from 'fs';
import path from 'path';
import { BaseMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { COMPANY_CONFIG } from '../../config/app';
import { COMPANY_KEYWORDS, CONVERSATION_CONSTANTS } from '../constants/conversationalRAG';
import { MessageUtils } from '../utils/MessageUtils';
import { MarkdownProcessor } from '../utils/MarkdownProcessor';

export class CompanyInfoHandler {
  private readonly companyInfo: string;
  private readonly companyName: string;
  private readonly markdownProcessor: MarkdownProcessor;

  constructor() {
    this.companyName = COMPANY_CONFIG.name;
    this.companyInfo = this.loadCompanyInfo();
    this.markdownProcessor = new MarkdownProcessor();
  }

  /**
   * Check if a question is related to the company
   */
  isCompanyRelatedQuestion(question: string): boolean {
    const companyName = this.companyName.toLowerCase();
    const keywords = [companyName, ...COMPANY_KEYWORDS];
    
    const questionLower = question.toLowerCase();
    return keywords.some(keyword => questionLower.includes(keyword));
  }

  /**
   * Handle company-related questions using conversation history
   */
  async handleCompanyQuestion(
    question: string,
    messages: BaseMessage[],
    llm: ChatOpenAI
  ): Promise<string> {
    try {
      const systemPrompt = this.createSystemPrompt();
      
      const formattedMessages = MessageUtils.formatMessagesForLLM(
        messages, 
        systemPrompt, 
        CONVERSATION_CONSTANTS.MAX_MESSAGE_HISTORY, 
        question
      );
      
      const response = await llm.call(formattedMessages);
      
      return this.markdownProcessor.processMarkdown(response.text);
      
    } catch (error) {
      console.error('❌ Company info generation error:', error);
      
      // Fallback response
      return `${this.companyName} is a leading company in the ${COMPANY_CONFIG.industry} industry. We provide comprehensive services to our clients. Contact us at ${COMPANY_CONFIG.email} or ${COMPANY_CONFIG.phone} to schedule a free consultation.`;
    }
  }

  private createSystemPrompt(): string {
    return `You are a knowledgeable assistant representing ${this.companyName}. Use the following company information to answer questions in a helpful, professional, and conversational manner.

Company Information:
${this.companyInfo}

Instructions:
1. Answer questions directly and helpfully
2. Use specific information from the company data provided
3. Be conversational and professional
4. If the question is about services, highlight relevant offerings
5. If asked about achievements/metrics, use the specific numbers provided
6. Include contact information when appropriate
7. Keep the response concise but comprehensive
8. Format your response using proper markdown:
   - Use clear headings (## for main sections, ### for subsections)
   - Use bullet points for lists
   - When creating tables, ensure proper spacing: | Column 1 | Column 2 |
   - Add blank lines before and after tables
   - Use **bold** for emphasis and important terms`;
  }

  private loadCompanyInfo(): string {
    try {
      const companyInfoPath = path.join(process.cwd(), '.github', 'about-company.md');
      return fs.readFileSync(companyInfoPath, 'utf-8');
    } catch (error) {
      console.error('Failed to load company info file, using environment config:', error);
      return `${COMPANY_CONFIG.name} is a ${COMPANY_CONFIG.industry}. Contact us at ${COMPANY_CONFIG.email} or ${COMPANY_CONFIG.phone}.`;
    }
  }
}
