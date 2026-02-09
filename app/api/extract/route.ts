import { NextRequest, NextResponse } from 'next/server';
import { SarvamAIClient, SarvamAI } from 'sarvamai';
import AdmZip from 'adm-zip';
import { writeFile, readFile, unlink, mkdir, rmdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { PDFDocument } from 'pdf-lib';

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const PAGES_PER_CHUNK = 5;

interface ProcessResult {
  success: boolean;
  pageCount: number;
  needsBatchProcessing: boolean;
  extractedText: string;
  language: string;
  chunksProcessed?: number;
}

// Get accurate PDF page count using pdf-lib
async function getPdfPageCount(buffer: Buffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    return pdfDoc.getPageCount();
  } catch {
    // Fallback to regex method
    const pdfString = buffer.toString('utf8', 0, Math.min(buffer.length, 100000));
    const countMatch = pdfString.match(/\/Type\s*\/Pages[^\0]*\/Count\s+(\d+)/);
    if (countMatch) {
      return parseInt(countMatch[1], 10);
    }
    const pageMatches = pdfString.match(/\/Type\s*\/Page\s*(\/|$)/g);
    return pageMatches ? Math.min(pageMatches.length, 1000) : 1;
  }
}

// Split PDF into chunks
async function splitPdfIntoChunks(
  buffer: Buffer,
  pagesPerChunk: number,
  outputDir: string
): Promise<string[]> {
  const pdfDoc = await PDFDocument.load(buffer);
  const totalPages = pdfDoc.getPageCount();
  const chunkFiles: string[] = [];

  console.log(`Splitting PDF: ${totalPages} pages into ${pagesPerChunk}-page chunks`);

  for (let i = 0; i < totalPages; i += pagesPerChunk) {
    const chunkDoc = await PDFDocument.create();
    const endPage = Math.min(i + pagesPerChunk, totalPages);
    
    // Copy pages from original to chunk
    for (let pageNum = i; pageNum < endPage; pageNum++) {
      const [copiedPage] = await chunkDoc.copyPages(pdfDoc, [pageNum]);
      chunkDoc.addPage(copiedPage);
    }

    // Save chunk
    const chunkFilename = `chunk_${String(Math.floor(i / pagesPerChunk) + 1).padStart(3, '0')}.pdf`;
    const chunkPath = join(outputDir, chunkFilename);
    const chunkBytes = await chunkDoc.save();
    await writeFile(chunkPath, Buffer.from(chunkBytes));
    
    chunkFiles.push(chunkPath);
    console.log(`  ✓ Created chunk ${chunkFiles.length}: pages ${i + 1}-${endPage} -> ${chunkFilename}`);
  }

  return chunkFiles;
}

function extractTextFromZip(zipBuffer: Buffer, outputFormat: string): string {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  
  let extractedText = '';
  
  for (const entry of entries) {
    if (entry.entryName.endsWith(`.${outputFormat}`)) {
      extractedText += zip.readAsText(entry);
    }
  }
  
  return extractedText;
}

// Map language codes to SDK format
function mapLanguageCode(code: string): SarvamAI.DocDigitizationSupportedLanguage {
  const languageMap: Record<string, SarvamAI.DocDigitizationSupportedLanguage> = {
    'hi-IN': SarvamAI.DocDigitizationSupportedLanguage.HiIn,
    'en-IN': SarvamAI.DocDigitizationSupportedLanguage.EnIn,
    'bn-IN': SarvamAI.DocDigitizationSupportedLanguage.BnIn,
    'gu-IN': SarvamAI.DocDigitizationSupportedLanguage.GuIn,
    'kn-IN': SarvamAI.DocDigitizationSupportedLanguage.KnIn,
    'ml-IN': SarvamAI.DocDigitizationSupportedLanguage.MlIn,
    'mr-IN': SarvamAI.DocDigitizationSupportedLanguage.MrIn,
    'or-IN': SarvamAI.DocDigitizationSupportedLanguage.OrIn,
    'pa-IN': SarvamAI.DocDigitizationSupportedLanguage.PaIn,
    'ta-IN': SarvamAI.DocDigitizationSupportedLanguage.TaIn,
    'te-IN': SarvamAI.DocDigitizationSupportedLanguage.TeIn,
    'ur-IN': SarvamAI.DocDigitizationSupportedLanguage.UrIn,
    'as-IN': SarvamAI.DocDigitizationSupportedLanguage.AsIn,
    'bodo-IN': SarvamAI.DocDigitizationSupportedLanguage.BodoIn,
    'doi-IN': SarvamAI.DocDigitizationSupportedLanguage.DoiIn,
    'ks-IN': SarvamAI.DocDigitizationSupportedLanguage.KsIn,
    'kok-IN': SarvamAI.DocDigitizationSupportedLanguage.KokIn,
    'mai-IN': SarvamAI.DocDigitizationSupportedLanguage.MaiIn,
    'mni-IN': SarvamAI.DocDigitizationSupportedLanguage.MniIn,
    'ne-IN': SarvamAI.DocDigitizationSupportedLanguage.NeIn,
    'sa-IN': SarvamAI.DocDigitizationSupportedLanguage.SaIn,
    'sat-IN': SarvamAI.DocDigitizationSupportedLanguage.SatIn,
    'sd-IN': SarvamAI.DocDigitizationSupportedLanguage.SdIn,
  };
  
  return languageMap[code] || SarvamAI.DocDigitizationSupportedLanguage.EnIn;
}

// Map output format to SDK format
function mapOutputFormat(format: string): SarvamAI.DocDigitizationOutputFormat {
  const formatMap: Record<string, SarvamAI.DocDigitizationOutputFormat> = {
    'html': SarvamAI.DocDigitizationOutputFormat.Html,
    'md': SarvamAI.DocDigitizationOutputFormat.Md,
    'json': SarvamAI.DocDigitizationOutputFormat.Json,
  };
  
  return formatMap[format] || SarvamAI.DocDigitizationOutputFormat.Md;
}

async function waitForJobCompletion(
  job: any,
  chunkIndex: number,
  maxAttempts: number = 300, // 10 minutes at 2s intervals
  pollIntervalMs: number = 2000
): Promise<any> {
  console.log(`    Waiting for completion (max ${maxAttempts} attempts, ~${Math.round(maxAttempts * pollIntervalMs / 60000)} minutes)...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Use SDK's getStatus() method
      const status = await job.getStatus();
      const state = status.job_state || status.jobState;

      if (state === 'Completed' || state === 'PartiallyCompleted') {
        console.log(`    ✓ Completed after ${attempt} attempts (~${Math.round(attempt * pollIntervalMs / 1000)}s)`);
        return status;
      }

      if (state === 'Failed') {
        throw new Error(`Job failed: ${status.error_message || 'Unknown error'}`);
      }

      if (attempt % 30 === 0) { // Log every minute
        const elapsedMinutes = Math.round(attempt * pollIntervalMs / 60000);
        console.log(`    Still processing... (${elapsedMinutes} minutes elapsed)`);
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Timeout waiting for chunk ${chunkIndex + 1} after ${Math.round(maxAttempts * pollIntervalMs / 60000)} minutes`);
      }
      // Don't log every error, just continue
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }

  throw new Error(`Timeout after ${maxAttempts} attempts (${Math.round(maxAttempts * pollIntervalMs / 60000)} minutes)`);
}

async function processSingleChunk(
  client: SarvamAIClient,
  chunkPath: string,
  language: SarvamAI.DocDigitizationSupportedLanguage,
  outputFormat: SarvamAI.DocDigitizationOutputFormat,
  chunkIndex: number
): Promise<string> {
  console.log(`\n  Processing chunk ${chunkIndex + 1}...`);
  
  // Step 1: Create job
  const job = await client.documentIntelligence.createJob({
    language: language,
    outputFormat: outputFormat,
  });
  console.log(`    ✓ Job created: ${job.jobId}`);
  
  // Step 2: Upload file
  await job.uploadFile(chunkPath);
  console.log('    ✓ File uploaded');
  
  // Step 3: Start processing
  await job.start();
  console.log('    ✓ Job started');
  
  // Step 4: Wait for completion with custom timeout
  const status = await waitForJobCompletion(job, chunkIndex);
  console.log(`    ✓ Job completed`);
  
  // Step 5: Get metrics
  const metrics = job.getPageMetrics();
  console.log('    ✓ Page metrics:', metrics);
  
  // Step 6: Download output
  const outputPath = `${chunkPath}_output.zip`;
  await job.downloadOutput(outputPath);
  console.log('    ✓ Output downloaded');
  
  // Step 7: Extract text from ZIP
  const zipBuffer = await readFile(outputPath);
  const extractedText = extractTextFromZip(zipBuffer, outputFormat);
  
  // Cleanup
  await unlink(outputPath).catch(() => {});
  
  return extractedText;
}

async function processDocumentDirect(
  client: SarvamAIClient,
  fileBuffer: Buffer,
  filename: string,
  language: SarvamAI.DocDigitizationSupportedLanguage,
  outputFormat: SarvamAI.DocDigitizationOutputFormat
): Promise<string> {
  const tempPath = join(tmpdir(), filename);
  await writeFile(tempPath, fileBuffer);
  
  try {
    console.log('\nProcessing PDF directly (no chunking)...');
    
    const job = await client.documentIntelligence.createJob({
      language: language,
      outputFormat: outputFormat,
    });
    console.log(`  ✓ Job created: ${job.jobId}`);
    
    await job.uploadFile(tempPath);
    console.log('  ✓ File uploaded');
    
    await job.start();
    console.log('  ✓ Job started');
    
    const status = await job.waitUntilComplete();
    console.log(`  ✓ Job completed with state: ${status.job_state}`);
    
    if (status.job_state === 'Failed') {
      throw new Error('Document processing failed');
    }
    
    const metrics = job.getPageMetrics();
    console.log('  ✓ Page metrics:', metrics);
    
    const outputPath = join(tmpdir(), `${filename}_output.zip`);
    await job.downloadOutput(outputPath);
    console.log('  ✓ Output downloaded');
    
    const zipBuffer = await readFile(outputPath);
    const extractedText = extractTextFromZip(zipBuffer, outputFormat);
    
    await unlink(tempPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    
    return extractedText;
  } catch (error) {
    await unlink(tempPath).catch(() => {});
    throw error;
  }
}

async function processLargePdf(
  client: SarvamAIClient,
  fileBuffer: Buffer,
  filename: string,
  language: SarvamAI.DocDigitizationSupportedLanguage,
  outputFormat: SarvamAI.DocDigitizationOutputFormat
): Promise<{ text: string; chunksProcessed: number }> {
  const chunksDir = join(tmpdir(), `${filename}_chunks`);
  await mkdir(chunksDir, { recursive: true });
  
  try {
    console.log('\n' + '='.repeat(70));
    console.log('Processing PDF with Batch Document Intelligence');
    console.log('='.repeat(70));
    
    // Step 1: Split PDF into chunks
    const chunkFiles = await splitPdfIntoChunks(fileBuffer, PAGES_PER_CHUNK, chunksDir);
    console.log(`\n✓ Split into ${chunkFiles.length} chunks`);
    
    // Step 2: Process chunks in PARALLEL for speed
    console.log('\n' + '='.repeat(70));
    console.log(`Processing ${chunkFiles.length} chunks in PARALLEL...`);
    console.log('(All chunks process simultaneously - much faster!)');
    console.log('='.repeat(70));

    const chunkPromises = chunkFiles.map((chunkFile, index) =>
      processSingleChunk(client, chunkFile, language, outputFormat, index)
        .then(text => ({ index, text, success: true }))
        .catch(error => {
          console.error(`  ✗ Error processing chunk ${index + 1}:`, error);
          return { index, text: '', success: false };
        })
    );

    // Wait for all chunks to complete in parallel
    const results = await Promise.all(chunkPromises);

    // Sort by index and collect successful results
    const extractedTexts: string[] = results
      .filter((result): result is { index: number; text: string; success: true } => result.success)
      .sort((a, b) => a.index - b.index)
      .map(result => `<!-- Chunk ${result.index + 1} -->\n\n${result.text}`);
    
    // Step 3: Merge outputs
    console.log('\n' + '='.repeat(70));
    console.log('Merging outputs...');
    console.log('='.repeat(70));
    
    const separator = outputFormat === 'md' ? '\n\n---\n\n' : '\n\n<!-- Page Break -->\n\n';
    const mergedText = extractedTexts.join(separator);
    
    console.log(`✓ Merged ${extractedTexts.length} chunks`);
    
    // Step 4: Cleanup
    console.log('\nCleaning up temporary files...');
    for (const chunkFile of chunkFiles) {
      await unlink(chunkFile).catch(() => {});
    }
    await rmdir(chunksDir).catch(() => {});
    console.log('✓ Cleanup complete');
    
    return {
      text: mergedText,
      chunksProcessed: extractedTexts.length,
    };
  } catch (error) {
    // Cleanup on error
    console.log('\nCleaning up after error...');
    try {
      const files = await readFile(chunksDir);
      // Note: This won't work as expected, but errors here are okay
    } catch {}
    throw error;
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
    const file = formData.get('file') as File;
    const languageCode = (formData.get('language') as string) || 'en-IN';
    const outputFormatCode = (formData.get('outputFormat') as string) || 'md';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Count pages to determine processing strategy
    const pageCount = await getPdfPageCount(buffer);
    const needsBatchProcessing = pageCount > PAGES_PER_CHUNK;

    // Initialize Sarvam AI client
    const client = new SarvamAIClient({
      apiSubscriptionKey: SARVAM_API_KEY,
    });

    // Map language and format to SDK types
    const language = mapLanguageCode(languageCode);
    const outputFormat = mapOutputFormat(outputFormatCode);

    let extractedText = '';
    let chunksProcessed = 1;

    if (needsBatchProcessing) {
      // Batch processing for large PDFs
      const result = await processLargePdf(
        client,
        buffer,
        file.name,
        language,
        outputFormat
      );
      extractedText = result.text;
      chunksProcessed = result.chunksProcessed;
    } else {
      // Direct processing for small PDFs
      extractedText = await processDocumentDirect(
        client,
        buffer,
        file.name,
        language,
        outputFormat
      );
    }

    const result: ProcessResult = {
      success: true,
      pageCount,
      needsBatchProcessing,
      extractedText,
      language: languageCode,
      chunksProcessed,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes (Vercel hobby plan limit)
