import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface ScrapeResult {
  success: boolean;
  title: string;
  url: string;
  extractedText: string;
  wordCount: number;
}

/**
 * Extract text from HTML content
 */
function extractTextFromHtml(html: string, url: string): { title: string; text: string } {
  const $ = cheerio.load(html);
  
  // Remove script, style, nav, footer, header, aside elements
  $('script, style, nav, footer, header, aside, iframe, noscript').remove();
  
  // Try to find main content
  let content = '';
  
  // Priority order for content extraction
  const contentSelectors = [
    'article',                    // Article tag
    '[role="main"]',             // Main content role
    'main',                       // Main tag
    '.content',                   // Common class names
    '.post-content',
    '.entry-content',
    '.article-content',
    '.post',
    '.blog-post',
    '#content',
    '#main-content',
    '.container',                 // Fallback
    'body',                       // Last resort
  ];
  
  for (const selector of contentSelectors) {
    const element = $(selector).first();
    if (element.length && element.text().trim().length > 200) {
      content = element.text();
      break;
    }
  }
  
  // If no content found, use body
  if (!content) {
    content = $('body').text();
  }
  
  // Get title
  const title = $('title').text() || 
                $('h1').first().text() || 
                $('h2').first().text() || 
                'Untitled';
  
  // Clean up text
  const cleanText = content
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
  
  return { title, text: cleanText };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;
    
    if (!url || !url.trim()) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    // Validate URL format
    let validatedUrl: string;
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid protocol');
      }
      validatedUrl = urlObj.toString();
    } catch {
      // Try adding https:// if missing
      try {
        const urlObj = new URL(`https://${url}`);
        validatedUrl = urlObj.toString();
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    }
    
    console.log(`Fetching content from: ${validatedUrl}`);
    
    // Fetch the webpage
    const response = await fetch(validatedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    // Check if it's HTML
    if (!contentType.includes('text/html')) {
      throw new Error('URL does not point to an HTML page');
    }
    
    const html = await response.text();
    
    if (!html || html.length < 100) {
      throw new Error('No content found at the URL');
    }
    
    // Extract text from HTML
    const { title, text } = extractTextFromHtml(html, validatedUrl);
    
    if (!text || text.length < 100) {
      throw new Error('Could not extract meaningful text from the URL');
    }
    
    // Limit text length (max 100,000 characters)
    const maxLength = 100000;
    const finalText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    
    const wordCount = finalText.split(/\s+/).length;
    
    console.log(`✓ Extracted ${finalText.length} characters (${wordCount} words) from ${validatedUrl}`);
    
    const result: ScrapeResult = {
      success: true,
      title,
      url: validatedUrl,
      extractedText: finalText,
      wordCount,
    };
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error scraping URL:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to scrape URL',
        details: 'Make sure the URL is valid and accessible'
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute timeout
