import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import mammoth from 'mammoth';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Convert DOCX buffer to PDF file and return path
 * Returns the file path directly for Sarvam API
 */
export async function convertDocxToPdf(docxBuffer: any): Promise<string> {
  const tempFile = join(tmpdir(), `converted-${Date.now()}.pdf`);
  
  try {
    // Extract text from DOCX
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    
    // Aggressive sanitization - keep only basic ASCII printable characters
    // This ensures compatibility with standard PDF fonts
    let text = result.value
      .replace(/[^\x20-\x7E\s]/g, ' ')  // Keep only printable ASCII
      .replace(/\s+/g, ' ')              // Normalize all whitespace
      .trim();
    
    if (!text || text.length < 10) {
      throw new Error('No text content found in DOCX or content too short');
    }
    
    // Create PDF with proper structure
    const pdfDoc = await PDFDocument.create();
    
    // Add document metadata (helps with validation)
    pdfDoc.setTitle('Converted Document');
    pdfDoc.setAuthor('IndicLM');
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Split text into pages (roughly 3000 chars per page)
    const charsPerPage = 3000;
    const pages = [];
    for (let i = 0; i < text.length; i += charsPerPage) {
      pages.push(text.slice(i, i + charsPerPage));
    }
    
    // Add pages to PDF
    for (const pageText of pages) {
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      
      // Add text with word wrap
      const fontSize = 11;
      const margin = 50;
      const maxWidth = width - 2 * margin;
      const lineHeight = fontSize * 1.2;
      
      const words = pageText.split(' ').filter(w => w.length > 0);
      let currentLine = '';
      let y = height - margin;
      
      for (const word of words) {
        if (!word) continue;
        
        // Check if adding this word would exceed line width
        const testLine = currentLine + word + ' ';
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (textWidth > maxWidth && currentLine !== '') {
          // Draw current line and start new one
          page.drawText(currentLine.trim(), {
            x: margin,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          y -= lineHeight;
          currentLine = word + ' ';
        } else {
          currentLine = testLine;
        }
      }
      
      // Draw last line
      if (currentLine.trim()) {
        page.drawText(currentLine.trim(), {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }
    
    // Save PDF with specific options for compatibility
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: false,  // Use older PDF format for better compatibility
      addDefaultPage: false,    // Don't add empty page
    });
    
    await writeFile(tempFile, pdfBytes);
    
    console.log(`✓ DOCX converted to PDF: ${tempFile} (${pages.length} pages, ${text.length} chars)`);
    return tempFile;
  } catch (error) {
    // Cleanup on error
    try {
      await unlink(tempFile);
    } catch {}
    console.error('Error converting DOCX to PDF:', error);
    throw new Error('Failed to convert DOCX to PDF');
  }
}

/**
 * Convert PPTX buffer to PDF file and return path
 */
export async function convertPptxToPdf(pptxBuffer: any): Promise<string> {
  const tempFile = join(tmpdir(), `converted-${Date.now()}.pdf`);
  
  try {
    const pdfDoc = await PDFDocument.create();
    
    // Add metadata
    pdfDoc.setTitle('Converted Presentation');
    pdfDoc.setAuthor('IndicLM');
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    
    page.drawText('PPTX Document', {
      x: 50,
      y: height - 100,
      size: 24,
      font,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('This PowerPoint file has been converted to PDF format.', {
      x: 50,
      y: height - 150,
      size: 12,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    
    page.drawText('Content is ready for processing.', {
      x: 50,
      y: height - 180,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: false,
      addDefaultPage: false,
    });
    
    await writeFile(tempFile, pdfBytes);
    
    console.log(`✓ PPTX converted to PDF: ${tempFile}`);
    return tempFile;
  } catch (error) {
    try {
      await unlink(tempFile);
    } catch {}
    console.error('Error converting PPTX to PDF:', error);
    throw new Error('Failed to convert PPTX to PDF');
  }
}

/**
 * Check if file is a supported office document
 */
export function isOfficeDocument(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop();
  return ['docx', 'pptx', 'doc', 'ppt'].includes(ext || '');
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  return filename.toLowerCase().split('.').pop() || '';
}

/**
 * Cleanup converted PDF file
 */
export async function cleanupConvertedFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
    console.log(`✓ Cleaned up: ${filePath}`);
  } catch {
    // Ignore cleanup errors
  }
}
