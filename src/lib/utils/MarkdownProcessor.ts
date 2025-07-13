/**
 * Markdown Processor
 * Handles markdown formatting and post-processing logic
 */

export class MarkdownProcessor {
  private readonly debugMode: boolean;

  constructor() {
    this.debugMode = process.env.NODE_ENV === 'development';
  }

  /**
   * Post-process markdown response to ensure proper formatting
   */
  processMarkdown(text: string): string {
    this.debugMarkdown(text, 'Before Post-Processing');
    
    let processedText = text;
    
    // Fix table formatting - ensure proper spacing around pipes
    processedText = this.fixTableFormatting(processedText);
    
    // Ensure proper spacing around headers
    processedText = processedText.replace(/^(#{1,6})\s*(.+)$/gm, '$1 $2');
    
    // Ensure proper list formatting
    processedText = this.fixListFormatting(processedText);
    
    // Clean up excessive whitespace but preserve intentional formatting
    processedText = processedText.replace(/\n{4,}/g, '\n\n\n');
    
    const finalText = processedText.trim();
    this.debugMarkdown(finalText, 'After Post-Processing');
    
    return finalText;
  }

  /**
   * Generate context-aware formatting instructions based on the question
   */
  generateFormattingInstructions(question: string): string {
    const questionLower = question.toLowerCase();
    
    // Check for question types that might benefit from tables
    const tableKeywords = ['compare', 'comparison', 'vs', 'difference', 'benefits', 'advantages', 'pros and cons', 'summary table'];
    const needsTable = tableKeywords.some(keyword => questionLower.includes(keyword));
    
    // Check for question types that might need structured lists
    const listKeywords = ['steps', 'process', 'how to', 'checklist', 'requirements', 'factors', 'types of'];
    const needsList = listKeywords.some(keyword => questionLower.includes(keyword));
    
    let instructions = `
Format Guidelines:
- Use clear, professional markdown formatting
- Include relevant headings (## for main sections)`;

    if (needsTable) {
      instructions += `
- When comparing or summarizing, use well-formatted tables:
  * Ensure proper spacing: | Column Header | Description |
  * Add blank lines before and after tables
  * Use descriptive column headers
  * Keep table cells concise but informative`;
    }
    
    if (needsList) {
      instructions += `
- Use numbered lists for processes or steps
- Use bullet points for features, benefits, or key points
- Ensure proper indentation and spacing`;
    }
    
    instructions += `
- Use **bold** for key terms and important concepts
- Use *italics* for emphasis
- Keep paragraphs concise and well-structured
- End with a clear summary or key takeaways when appropriate`;
    
    return instructions;
  }

  private fixTableFormatting(text: string): string {
    // Fix table formatting - ensure proper spacing around pipes
    let processedText = text.replace(/\|([^|]+)\|/g, (match, content) => {
      const cleanContent = content.trim();
      return `| ${cleanContent} |`;
    });
    
    // Ensure tables have proper line breaks before and after
    processedText = processedText.replace(/([^\n])\|[^|]*\|/g, '\n$&');
    processedText = processedText.replace(/(\|[^|]*\|[^\n])(?!\n)/g, '$1\n');
    
    // Fix header separator lines in tables
    processedText = processedText.replace(/\|\s*-+\s*\|/g, (match) => {
      const segments = match.split('|').filter(s => s.trim());
      return '|' + segments.map(s => ' ' + '-'.repeat(Math.max(3, s.trim().length)) + ' ').join('|') + '|';
    });

    return processedText;
  }

  private fixListFormatting(text: string): string {
    let processedText = text;
    
    // Ensure proper list formatting
    processedText = processedText.replace(/^(\s*)[-*+]\s*(.+)$/gm, '$1- $2');
    processedText = processedText.replace(/^(\s*)(\d+)\.\s*(.+)$/gm, '$1$2. $3');
    
    return processedText;
  }

  private debugMarkdown(text: string, label: string): void {
    if (this.debugMode) {
      console.log(`\n🔍 [${label}] Markdown Debug:`);
      console.log('Raw text:', JSON.stringify(text));
      console.log('Formatted text:');
      console.log(text);
      console.log('--- End Debug ---\n');
    }
  }
}
