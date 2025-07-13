/**
 * Web Content Service
 * Handles web content loading, scraping, and cleaning using LangChain loaders
 */

import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import * as cheerio from 'cheerio';

export interface WebContentOptions {
  selectorsToIgnore?: string[];
  timeout?: number;
  headers?: Record<string, string>;
}

export interface WebContentResult {
  content: string;
  metadata: {
    url: string;
    title?: string;
    loadedAt: string;
    contentLength: number;
    selectorsIgnored?: string[];
  };
}

/**
 * Web Content Service for loading and processing web pages
 */
export class WebContentService {
  private defaultOptions: Required<Omit<WebContentOptions, 'selectorsToIgnore'>> = {
    timeout: 30000, // 30 seconds
    headers: {
      'User-Agent': 'RAG-App Web Loader 1.0',
    },
  };

  /**
   * Load content from a web URL with optional content filtering
   */
  async loadWebContent(
    url: string, 
    options: WebContentOptions = {}
  ): Promise<WebContentResult> {
    try {
      // Validate URL
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
      }

      console.log(`🌐 Loading web content from: ${url}`);
      if (options.selectorsToIgnore && options.selectorsToIgnore.length > 0) {
        console.log(`🚫 Will ignore selectors: ${options.selectorsToIgnore.join(', ')}`);
      }
      
      // Configure the CheerioWebBaseLoader with custom selector processing
      const loader = new CheerioWebBaseLoader(url, {
        timeout: options.timeout || this.defaultOptions.timeout,
        selector: "body", // Load the full body content first
      });

      // Load the document
      const docs = await loader.load();
      
      if (!docs || docs.length === 0) {
        throw new Error('No content could be extracted from the URL');
      }

      const doc = docs[0];
      
      // Apply CSS selector filtering if specified
      let finalContent: string;
      let extractedTitle: string | undefined;
      
      if (options.selectorsToIgnore && options.selectorsToIgnore.length > 0) {
        const result = await this.filterContentBySelectors(url, options.selectorsToIgnore);
        finalContent = result.content;
        extractedTitle = result.title;
      } else {
        finalContent = doc.pageContent.trim();
      }
      
      // Clean and post-process content
      const cleanedContent = this.cleanContent(finalContent, options.selectorsToIgnore);

      console.log(`✅ Successfully loaded ${cleanedContent.length} characters from ${url}`);

      // Extract title from metadata or use extracted title
      const title = extractedTitle || 
                   doc.metadata?.title || 
                   doc.metadata?.['og:title'] || 
                   this.generateTitleFromUrl(url);

      return {
        content: cleanedContent,
        metadata: {
          url,
          title,
          loadedAt: new Date().toISOString(),
          contentLength: finalContent.length,
          selectorsIgnored: options.selectorsToIgnore,
          ...doc.metadata, // Include any additional metadata from the loader
        },
      };

    } catch (error) {
      console.error(`❌ Failed to load web content from ${url}:`, error);
      
      if (error instanceof Error) {
        // Provide more specific error messages
        if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
          throw new Error(`Failed to connect to ${url}. Please check the URL and try again.`);
        }
        if (error.message.includes('timeout')) {
          throw new Error(`Request to ${url} timed out. The page may be too slow to load.`);
        }
        if (error.message.includes('404')) {
          throw new Error(`Page not found at ${url}. Please check the URL.`);
        }
        throw new Error(`Failed to load content from ${url}: ${error.message}`);
      }
      
      throw new Error(`Failed to load content from ${url}: Unknown error`);
    }
  }

  /**
   * Load content from multiple URLs concurrently
   */
  async loadMultipleWebContent(
    urls: string[],
    options: WebContentOptions = {}
  ): Promise<WebContentResult[]> {
    console.log(`🌐 Loading content from ${urls.length} URLs`);
    
    // Load all URLs concurrently but with reasonable limits
    const batchSize = 5; // Process 5 URLs at a time to avoid overwhelming servers
    const results: WebContentResult[] = [];
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchPromises = batch.map(url => 
        this.loadWebContent(url, options).catch(error => {
          console.warn(`⚠️ Failed to load ${url}:`, error.message);
          return null; // Continue with other URLs even if one fails
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((result): result is WebContentResult => result !== null));
    }
    
    console.log(`✅ Successfully loaded content from ${results.length}/${urls.length} URLs`);
    return results;
  }

  /**
   * Generate a reasonable title from a URL if no title is found
   */
  private generateTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        // Remove file extensions and convert to title case
        const title = lastPart
          .replace(/\.[^/.]+$/, '') // Remove file extension
          .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
          .replace(/\b\w/g, l => l.toUpperCase()); // Title case
        
        return title || urlObj.hostname;
      }
      
      return urlObj.hostname;
    } catch {
      return 'Web Content';
    }
  }

  /**
   * Clean and post-process loaded content
   * Remove unwanted elements based on selectors
   */
  private cleanContent(content: string, selectorsToIgnore?: string[]): string {
    if (!selectorsToIgnore || selectorsToIgnore.length === 0) {
      return content;
    }

    // This is a simplified content cleaning approach
    // In a production environment, you might want to use a more sophisticated
    // HTML parsing and cleaning library
    
    let cleanedContent = content;
    
    // Remove common unwanted patterns
    const unwantedPatterns = [
      /Advertisement\s*/gi,
      /Subscribe\s+to\s+our\s+newsletter/gi,
      /Cookie\s+Policy/gi,
      /Privacy\s+Policy/gi,
      /Terms\s+of\s+Service/gi,
      /Follow\s+us\s+on/gi,
    ];
    
    unwantedPatterns.forEach(pattern => {
      cleanedContent = cleanedContent.replace(pattern, '');
    });
    
    // Clean up extra whitespace
    cleanedContent = cleanedContent
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\n\s*\n/g, '\n\n') // Multiple newlines to double newline
      .trim();
    
    return cleanedContent;
  }

  /**
   * Filter content by removing elements matching the specified CSS selectors
   */
  private async filterContentBySelectors(url: string, selectorsToIgnore: string[]): Promise<{content: string; title: string}> {
    const cheerio = await import('cheerio');
    
    try {
      // Fetch the HTML directly to apply selector filtering
      const response = await fetch(url, {
        headers: this.defaultOptions.headers,
        signal: AbortSignal.timeout(this.defaultOptions.timeout),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Extract title from head section before removing elements
      const extractedTitle = this.extractTitleFromHtml($, url);
      
      // Remove elements matching the ignore selectors
      selectorsToIgnore.forEach(selector => {
        const trimmedSelector = selector.trim();
        if (!trimmedSelector) return; // Skip empty selectors
        
        try {
          const removed = $(trimmedSelector);
          if (removed.length > 0) {
            console.log(`🚫 Removed ${removed.length} elements matching selector: ${trimmedSelector}`);
            removed.remove();
          }
        } catch (error) {
          console.warn(`⚠️ Invalid CSS selector: ${trimmedSelector}`, error);
        }
      });
      
      // Also remove common unwanted elements by default
      $('script, style, nav, footer, header, aside, iframe, .advertisement, .ads, .cookie-banner').remove();
      
      // Extract text content from the cleaned HTML
      const textContent = $('body').text() || $.text();
      
      // Return both content and extracted title
      return {
        content: textContent.trim(),
        title: extractedTitle
      };
      
    } catch (error) {
      console.warn(`⚠️ Failed to apply selector filtering for ${url}, falling back to default loading:`, error);
      // Fallback to standard loading if selector filtering fails
      const loader = new CheerioWebBaseLoader(url, {
        timeout: this.defaultOptions.timeout,
      });
      const docs = await loader.load();
      return {
        content: docs[0]?.pageContent || '',
        title: this.generateTitleFromUrl(url)
      };
    }
  }

  /**
   * Extract title from HTML head section using various meta tags
   */
  private extractTitleFromHtml($: cheerio.CheerioAPI, url: string): string {
    // Try different title sources in order of preference
    const titleSources = [
      $('head title').first().text(),                    // Standard HTML title
      $('meta[property="og:title"]').attr('content'),    // Open Graph title
      $('meta[name="twitter:title"]').attr('content'),   // Twitter Card title
      $('meta[property="article:title"]').attr('content'), // Article title
      $('h1').first().text(),                           // First H1 as fallback
      this.generateTitleFromUrl(url)                     // URL-based fallback
    ];

    // Return the first non-empty title
    for (const title of titleSources) {
      if (title && title.trim()) {
        const cleanTitle = title.trim().replace(/\s+/g, ' ');
        console.log(`📄 Extracted title: "${cleanTitle}"`);
        return cleanTitle;
      }
    }

    return this.generateTitleFromUrl(url);
  }

  /**
   * Validate if a URL is accessible and contains meaningful content
   */
  async validateUrl(url: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const result = await this.loadWebContent(url);
      
      if (result.content.length < 100) {
        return { valid: false, reason: 'Content too short (less than 100 characters)' };
      }
      
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        reason: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
