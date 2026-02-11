import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

/**
 * Extract text from PPTX buffer
 * PPTX files are ZIP archives with XML content
 */
export async function extractTextFromPptx(pptxBuffer: Buffer): Promise<string> {
  try {
    // Load the PPTX as a ZIP file
    const zip = await JSZip.loadAsync(pptxBuffer);
    
    // Find all slide files (ppt/slides/slide1.xml, slide2.xml, etc.)
    const slideFiles: string[] = [];
    
    zip.forEach((relativePath, file) => {
      if (relativePath.startsWith('ppt/slides/slide') && relativePath.endsWith('.xml')) {
        slideFiles.push(relativePath);
      }
    });
    
    // Sort slides by number
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
      return numA - numB;
    });
    
    if (slideFiles.length === 0) {
      throw new Error('No slides found in PPTX file');
    }
    
    console.log(`Found ${slideFiles.length} slides in PPTX`);
    
    // Extract text from each slide
    const slideTexts: string[] = [];
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: true,
      trimValues: true,
    });
    
    for (const slidePath of slideFiles) {
      try {
        // Get slide XML content
        const slideFile = zip.file(slidePath);
        if (!slideFile) continue;
        
        const xmlContent = await slideFile.async('text');
        const parsed = parser.parse(xmlContent);
        
        // Extract text from the parsed XML
        const texts = extractTextsFromSlide(parsed);
        
        if (texts.length > 0) {
          slideTexts.push(`<!-- Slide ${slideTexts.length + 1} -->\n${texts.join('\n')}`);
        }
      } catch (slideError) {
        console.error(`Error processing slide ${slidePath}:`, slideError);
        // Continue with other slides
      }
    }
    
    if (slideTexts.length === 0) {
      throw new Error('No text content found in PPTX slides');
    }
    
    return slideTexts.join('\n\n');
  } catch (error) {
    console.error('Error extracting text from PPTX:', error);
    throw new Error('Failed to extract text from PPTX file');
  }
}

/**
 * Recursively extract text strings from parsed slide XML
 */
function extractTextsFromSlide(obj: any): string[] {
  const texts: string[] = [];
  
  if (typeof obj === 'string') {
    // Clean up the text
    const cleanText = obj.trim();
    if (cleanText && cleanText.length > 0) {
      texts.push(cleanText);
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      texts.push(...extractTextsFromSlide(item));
    }
  } else if (typeof obj === 'object' && obj !== null) {
    // Look for text elements in PowerPoint XML structure
    // Common text element names in PPTX
    const textKeys = ['t', 'a:t', 'a:p', 'a:r', 'p', 'r', 't'];
    
    for (const key of Object.keys(obj)) {
      // Skip attributes and metadata
      if (key.startsWith('@_')) continue;
      
      const value = obj[key];
      
      // If this is a text element, extract it
      if (textKeys.includes(key) && typeof value === 'string') {
        const cleanText = value.trim();
        if (cleanText && cleanText.length > 0) {
          texts.push(cleanText);
        }
      } else {
        // Recursively search in child elements
        texts.push(...extractTextsFromSlide(value));
      }
    }
  }
  
  return texts;
}
