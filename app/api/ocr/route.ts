import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const VISION_API_URL = 'https://api.sarvam.ai/vision';

interface OCRResult {
  filename: string;
  text: string;
  requestId: string;
}

/**
 * Extract text from image using Sarvam Vision OCR
 */
async function extractTextFromImage(imageBuffer: Buffer, filename: string): Promise<OCRResult> {
  if (!SARVAM_API_KEY) {
    throw new Error('SARVAM_API_KEY not configured');
  }

  // Save buffer to temp file
  const tempFile = join(tmpdir(), `ocr-${Date.now()}-${filename}`);
  await writeFile(tempFile, imageBuffer);

  try {
    // Create form data
    const formData = new FormData();
    
    // Convert buffer to Uint8Array then to Blob for FormData
    const uint8Array = new Uint8Array(imageBuffer);
    const blob = new Blob([uint8Array], { type: 'image/jpeg' });
    formData.append('file', blob, filename);
    formData.append('prompt_type', 'default_ocr');

    // Call Sarvam Vision API
    const response = await fetch(VISION_API_URL, {
      method: 'POST',
      headers: {
        'API-Subscription-Key': SARVAM_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OCR API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();

    return {
      filename,
      text: result.content || '',
      requestId: result.request_id,
    };
  } finally {
    // Cleanup temp file
    await unlink(tempFile).catch(() => {});
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!SARVAM_API_KEY) {
      return NextResponse.json(
        { error: 'SARVAM_API_KEY not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 images allowed' },
        { status: 400 }
      );
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.name}. Only JPG and PNG allowed` },
          { status: 400 }
        );
      }
    }

    console.log(`Processing ${files.length} images for OCR...`);

    // Process all images in parallel
    const ocrPromises = files.map(async (file) => {
      console.log(`  Processing: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      const buffer = Buffer.from(await file.arrayBuffer());
      return extractTextFromImage(buffer, file.name);
    });

    const results = await Promise.all(ocrPromises);

    // Combine all extracted text
    let combinedText = '';
    const processedImages: OCRResult[] = [];

    for (const result of results) {
      if (result.text && result.text.trim()) {
        combinedText += `\n\n<!-- Image: ${result.filename} -->\n\n${result.text}`;
        processedImages.push(result);
      }
    }

    combinedText = combinedText.trim();

    if (!combinedText) {
      return NextResponse.json(
        { error: 'No text could be extracted from the images' },
        { status: 400 }
      );
    }

    console.log(`✓ OCR complete. Extracted ${combinedText.length} characters from ${processedImages.length} images`);

    return NextResponse.json({
      success: true,
      extractedText: combinedText,
      imageCount: files.length,
      processedCount: processedImages.length,
      images: processedImages.map(img => ({
        filename: img.filename,
        textLength: img.text.length,
        requestId: img.requestId,
      })),
    });

  } catch (error) {
    console.error('Error in OCR processing:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR processing failed' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for multiple images
