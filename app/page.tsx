'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FileUpload } from '@/components/FileUpload';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ScriptDisplay, PodcastScript } from '@/components/ScriptDisplay';
import { TTSGenerator } from '@/components/TTSGenerator';
import { LoadingOverlay, LoadingState } from '@/components/LoadingOverlay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Sparkles, 
  Headphones, 
  Volume2,
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Mic,
  Languages,
  Upload,
  FileAudio,
  BookOpen,
  MessageCircle,
  ArrowLeft,
  RotateCcw,
  Settings,
  Link,
  Globe,
  Image as ImageIcon
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExtractionResult {
  success: boolean;
  pageCount: number;
  needsBatchProcessing: boolean;
  extractedText: string;
  language: string;
  chunksProcessed?: number;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [inputMode, setInputMode] = useState<'file' | 'url' | 'images'>('file');
  const [selectedLanguage, setSelectedLanguage] = useState('hi-IN');
  const [currentStep, setCurrentStep] = useState(1);
  const [loadingState, setLoadingState] = useState<LoadingState | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [generatedScript, setGeneratedScript] = useState<PodcastScript | null>(null);
  const [showTTS, setShowTTS] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setSelectedImages([]);
    setUrlInput('');
    setUrlTitle('');
    setInputMode('file');
    setExtractionResult(null);
    setGeneratedScript(null);
    setShowTTS(false);
    setCurrentStep(1);
    setError(null);
  };

  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const validFiles = Array.from(files).filter(file => validTypes.includes(file.type));
    
    if (validFiles.length > 10) {
      setError('Maximum 10 images allowed');
      setSelectedImages(validFiles.slice(0, 10));
    } else {
      setSelectedImages(validFiles);
      setError(null);
    }
  };

  const handleImagesOCR = async () => {
    if (selectedImages.length === 0) return;

    setLoadingState({
      step: 'extract',
      message: 'Processing Images',
      subMessage: `Extracting text from ${selectedImages.length} image(s)...`,
    });
    setError(null);

    try {
      const formData = new FormData();
      selectedImages.forEach((image) => {
        formData.append('images', image);
      });

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'OCR processing failed');
      }

      // Create extraction result from OCR
      const extractionResult: ExtractionResult = {
        success: true,
        pageCount: result.imageCount,
        needsBatchProcessing: false,
        extractedText: result.extractedText,
        language: selectedLanguage,
        chunksProcessed: result.processedCount,
      };

      setLoadingState(prev => prev ? { ...prev, progress: 100 } : null);
      setTimeout(() => {
        setLoadingState(null);
        setExtractionResult(extractionResult);
        setCurrentStep(2);
      }, 500);
    } catch (err) {
      setLoadingState(null);
      setError(err instanceof Error ? err.message : 'OCR processing failed');
    }
  };

  const handleScrapeUrl = async () => {
    if (!urlInput.trim()) return;

    setLoadingState({
      step: 'extract',
      message: 'Fetching URL',
      subMessage: `Scraping content from ${urlInput}...`,
    });
    setError(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to scrape URL');
      }

      setUrlTitle(result.title);
      
      // Create extraction result from URL content
      const extractionResult: ExtractionResult = {
        success: true,
        pageCount: 1,
        needsBatchProcessing: false,
        extractedText: result.extractedText,
        language: selectedLanguage,
        chunksProcessed: 1,
      };

      setLoadingState(prev => prev ? { ...prev, progress: 100 } : null);
      setTimeout(() => {
        setLoadingState(null);
        setExtractionResult(extractionResult);
        setCurrentStep(2);
      }, 500);
    } catch (err) {
      setLoadingState(null);
      setError(err instanceof Error ? err.message : 'Failed to scrape URL');
    }
  };

  const handleExtractDocument = async () => {
    if (!selectedFile) return;

    setLoadingState({
      step: 'extract',
      message: 'Uploading PDF',
      subMessage: `Processing ${selectedFile.name}...`,
    });
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('language', selectedLanguage);
      formData.append('outputFormat', 'md');

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to extract document');
      }

      setLoadingState(prev => prev ? { ...prev, progress: 100 } : null);
      setTimeout(() => {
        setLoadingState(null);
        setExtractionResult(result);
        setCurrentStep(2);
      }, 500);
    } catch (err) {
      setLoadingState(null);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleGenerateScript = async () => {
    if (!extractionResult?.extractedText) return;

    setLoadingState({
      step: 'script',
      message: 'Analyzing Document',
      subMessage: 'AI is reading the extracted content...',
    });
    setError(null);

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractedText: extractionResult.extractedText,
          language: selectedLanguage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate script');
      }

      setLoadingState(prev => prev ? { ...prev, progress: 100 } : null);
      setTimeout(() => {
        setLoadingState(null);
        setGeneratedScript(result.script);
        setCurrentStep(3);
      }, 500);
    } catch (err) {
      setLoadingState(null);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleProceedToTTS = () => {
    setShowTTS(true);
    setCurrentStep(4);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setExtractionResult(null);
    setGeneratedScript(null);
    setShowTTS(false);
    setCurrentStep(1);
    setError(null);
  };

  const handleGoBack = () => {
    if (currentStep === 4) {
      setShowTTS(false);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setGeneratedScript(null);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setExtractionResult(null);
      setCurrentStep(1);
    }
  };

  const steps = [
    { id: 1, label: 'Upload', description: 'Select PDF', icon: Upload },
    { id: 2, label: 'Extract', description: 'Read content', icon: FileText },
    { id: 3, label: 'Script', description: 'AI writes', icon: MessageCircle },
    { id: 4, label: 'Audio', description: 'Generate voices', icon: Volume2 },
  ];

  return (
    <div className="min-h-screen bg-[#F8F6F3]">
      {loadingState && <LoadingOverlay state={loadingState} />}

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E5E5E5] bg-white/90 backdrop-blur-xl">
        <div className="container mx-auto px-4 lg:px-6 h-14 lg:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:gap-4">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 lg:gap-4 hover:opacity-80 transition-opacity"
            >
              <Image
                src="https://dashboard.sarvam.ai/assets/sarvam-logo.png"
                alt="Sarvam AI"
                width={120}
                height={32}
                className="h-6 lg:h-8 w-auto cursor-pointer"
              />
            </button>
            <div className="hidden sm:block h-6 w-px bg-[#E5E5E5]" />
            <div className="hidden sm:flex items-center gap-2">
              <Headphones className="h-5 w-5 text-[#2B2B2B]" />
              <span className="font-medium text-[#2B2B2B]">Podcast</span>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            {currentStep > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="text-[#8B8B8B] hover:text-[#2B2B2B] hover:bg-[#F5F5F5] h-8 px-2 lg:px-3"
              >
                <ArrowLeft className="h-4 w-4 lg:mr-1" />
                <span className="hidden lg:inline">Back</span>
              </Button>
            )}
            {currentStep > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-[#8B8B8B] hover:text-[#E88B7D] hover:bg-[#E88B7D]/10 h-8 px-2 lg:px-3"
              >
                <RotateCcw className="h-4 w-4 lg:mr-1" />
                <span className="hidden lg:inline">New</span>
              </Button>
            )}
            <Badge variant="secondary" className="bg-[#C8D5B9] text-[#2B2B2B] border-0 text-xs lg:text-sm">
              <Languages className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">11 Languages</span>
              <span className="sm:hidden">11</span>
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-6xl">
        {/* Hero Section */}
        <div className="mb-8 lg:mb-12 text-center px-4">
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#2B2B2B] mb-3">
            Transform Documents into Podcasts
          </h1>
          <p className="text-sm lg:text-base text-[#8B8B8B] max-w-xl mx-auto">
            Upload any PDF and create engaging multi-speaker podcasts in Indian languages
          </p>
        </div>

        {/* Step Indicator - Horizontal scroll on mobile */}
        <div className="mb-8 lg:mb-12 px-4 lg:px-8 overflow-x-auto">
          <div className="relative min-w-[320px] max-w-2xl mx-auto">
            {/* Full connecting line */}
            <div className="absolute top-5 lg:top-6 left-6 right-6 h-0.5 bg-[#E5E5E5]">
              {/* Active progress */}
              <div
                className="h-full bg-[#2B2B2B] transition-all duration-500"
                style={{ width: `${Math.max(0, ((currentStep - 1) / 3) * 100)}%` }}
              />
            </div>

            {/* Steps */}
            <div className="relative flex justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep >= step.id;
                const isCurrent = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div key={step.id} className="flex flex-col items-center">
                    {/* Circle */}
                    <div
                      className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center transition-all duration-300 relative z-10 ${
                        isCurrent
                          ? 'bg-[#2B2B2B] text-white scale-110 shadow-lg'
                          : isCompleted
                            ? 'bg-[#2B2B2B] text-white'
                            : 'bg-white border-2 border-[#E5E5E5] text-[#8B8B8B]'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 lg:h-5 lg:w-5" />
                      ) : (
                        <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                      )}
                    </div>
                    {/* Label */}
                    <div className="mt-2 lg:mt-3 text-center">
                      <p className={`text-xs lg:text-sm font-medium ${isActive ? 'text-[#2B2B2B]' : 'text-[#8B8B8B]'}`}>
                        {step.label}
                      </p>
                      <p className="text-[10px] lg:text-xs text-[#8B8B8B] mt-0.5 hidden sm:block">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 max-w-2xl mx-auto bg-[#E88B7D]/10 border-[#E88B7D] text-[#2B2B2B]">
            <AlertCircle className="h-4 w-4 text-[#E88B7D]" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Left Column - Controls */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Step 1: Upload */}
            {currentStep === 1 && (
              <Card className="bg-white border border-[#E5E5E5]">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Upload className="h-5 w-5 text-[#8B8B8B]" />
                    Add Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Input Mode Toggle */}
                  <div className="flex gap-2 p-1 bg-[#F8F6F3] rounded-xl">
                    <button
                      onClick={() => setInputMode('file')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        inputMode === 'file'
                          ? 'bg-white text-[#2B2B2B] shadow-sm'
                          : 'text-[#8B8B8B] hover:text-[#2B2B2B]'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-4 w-4" />
                        File
                      </div>
                    </button>
                    <button
                      onClick={() => setInputMode('url')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        inputMode === 'url'
                          ? 'bg-white text-[#2B2B2B] shadow-sm'
                          : 'text-[#8B8B8B] hover:text-[#2B2B2B]'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Link className="h-4 w-4" />
                        URL
                      </div>
                    </button>
                    <button
                      onClick={() => setInputMode('images')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        inputMode === 'images'
                          ? 'bg-white text-[#2B2B2B] shadow-sm'
                          : 'text-[#8B8B8B] hover:text-[#2B2B2B]'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Images
                      </div>
                    </button>
                  </div>

                  {inputMode === 'file' && (
                    <>
                      <FileUpload
                        onFileSelect={handleFileSelect}
                        selectedFile={selectedFile}
                        onClear={handleClearFile}
                        isProcessing={!!loadingState}
                      />

                      <div className="pt-4 border-t border-[#E5E5E5]">
                        <LanguageSelector
                          value={selectedLanguage}
                          onChange={setSelectedLanguage}
                          disabled={!!loadingState || !selectedFile}
                        />
                      </div>

                      {selectedFile && (
                        <Button
                          onClick={handleExtractDocument}
                          disabled={!!loadingState}
                          className="w-full h-12 bg-[#2B2B2B] hover:bg-[#1a1a1a] text-white rounded-xl"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Extract Content
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}

                  {inputMode === 'url' && (
                    <>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[#2B2B2B]">
                            Webpage URL
                          </label>
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B8B8B]" />
                            <input
                              type="url"
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                              placeholder="https://example.com/article"
                              className="w-full h-12 pl-10 pr-4 bg-white border border-[#E5E5E5] rounded-xl text-[#2B2B2B] placeholder:text-[#8B8B8B] focus:outline-none focus:border-[#2B2B2B]"
                              disabled={!!loadingState}
                            />
                          </div>
                          <p className="text-xs text-[#8B8B8B]">
                            Paste a link to a blog post, article, or any webpage
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#E5E5E5]">
                        <LanguageSelector
                          value={selectedLanguage}
                          onChange={setSelectedLanguage}
                          disabled={!!loadingState || !urlInput.trim()}
                        />
                      </div>

                      {urlInput.trim() && (
                        <Button
                          onClick={handleScrapeUrl}
                          disabled={!!loadingState}
                          className="w-full h-12 bg-[#2B2B2B] hover:bg-[#1a1a1a] text-white rounded-xl"
                        >
                          <Globe className="mr-2 h-4 w-4" />
                          Fetch Content
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}

                  {inputMode === 'images' && (
                    <>
                      <div className="space-y-4">
                        <div className="border-2 border-dashed border-[#E5E5E5] rounded-xl p-6 text-center hover:border-[#2B2B2B] hover:bg-[#F8F6F3] transition-all cursor-pointer">
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png"
                            multiple
                            onChange={(e) => handleImageSelect(e.target.files)}
                            disabled={!!loadingState}
                            className="hidden"
                            id="image-upload"
                          />
                          <label htmlFor="image-upload" className="cursor-pointer block">
                            <ImageIcon className="h-8 w-8 text-[#8B8B8B] mx-auto mb-2" />
                            <p className="text-sm font-medium text-[#2B2B2B]">
                              Drop images here or click to browse
                            </p>
                            <p className="text-xs text-[#8B8B8B] mt-1">
                              JPG, PNG (max 10 images)
                            </p>
                          </label>
                        </div>

                        {selectedImages.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-[#2B2B2B]">
                              {selectedImages.length} image(s) selected
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {selectedImages.map((img, idx) => (
                                <div key={idx} className="bg-[#F8F6F3] px-3 py-1 rounded-lg text-xs text-[#2B2B2B]">
                                  {img.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-[#E5E5E5]">
                        <LanguageSelector
                          value={selectedLanguage}
                          onChange={setSelectedLanguage}
                          disabled={!!loadingState || selectedImages.length === 0}
                        />
                      </div>

                      {selectedImages.length > 0 && (
                        <Button
                          onClick={handleImagesOCR}
                          disabled={!!loadingState}
                          className="w-full h-12 bg-[#2B2B2B] hover:bg-[#1a1a1a] text-white rounded-xl"
                        >
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Extract Text (OCR)
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Extraction Complete */}
            {currentStep === 2 && extractionResult && (
              <Card className="bg-white border border-[#E5E5E5]">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#C8D5B9] flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-[#2B2B2B]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium">
                        {urlTitle || 'Content Extracted'}
                      </CardTitle>
                      <p className="text-sm text-[#8B8B8B]">
                        {urlInput ? 'Webpage content ready' : 'Ready to create script'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#F8F6F3] p-4 rounded-xl">
                      <p className="text-xs text-[#8B8B8B] uppercase tracking-wide">
                        {urlInput ? 'Source' : 'Pages'}
                      </p>
                      <p className="text-2xl font-semibold text-[#2B2B2B]">
                        {urlInput ? 'Web' : extractionResult.pageCount}
                      </p>
                    </div>
                    <div className="bg-[#F8F6F3] p-4 rounded-xl">
                      <p className="text-xs text-[#8B8B8B] uppercase tracking-wide">Language</p>
                      <p className="text-2xl font-semibold text-[#2B2B2B]">{extractionResult.language}</p>
                    </div>
                  </div>
                  
                  {extractionResult.needsBatchProcessing && (
                    <div className="flex items-center gap-2 text-sm text-[#8B8B8B] bg-[#F8F6F3] p-3 rounded-xl">
                      <BookOpen className="h-4 w-4" />
                      <span>Processed in {extractionResult.chunksProcessed} batches</span>
                    </div>
                  )}

                  <Button
                    onClick={handleGenerateScript}
                    disabled={!!loadingState}
                    className="w-full h-12 bg-[#A8B8E8] hover:bg-[#95a5d4] text-[#2B2B2B] rounded-xl font-medium"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Podcast Script
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Script Generated */}
            {currentStep === 3 && generatedScript && (
              <Card className="bg-white border border-[#E5E5E5]">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F5B57A] flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-[#2B2B2B]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium">Script Generated</CardTitle>
                      <p className="text-sm text-[#8B8B8B]">{generatedScript.segments.length + 2} segments ready</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleProceedToTTS}
                    className="w-full h-12 bg-[#2B2B2B] hover:bg-[#1a1a1a] text-white rounded-xl"
                  >
                    <Mic className="mr-2 h-4 w-4" />
                    Generate Audio
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 4: TTS Generator */}
            {currentStep === 4 && showTTS && generatedScript && (
              <TTSGenerator 
                script={generatedScript} 
                language={selectedLanguage}
              />
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="lg:col-span-3">
            {currentStep === 1 && !selectedFile && (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl border border-dashed border-[#E5E5E5]">
                <div className="w-20 h-20 rounded-2xl bg-[#F8F6F3] flex items-center justify-center mb-6">
                  <FileAudio className="h-10 w-10 text-[#8B8B8B]" />
                </div>
                <h3 className="text-xl font-medium text-[#2B2B2B] mb-2">Upload a PDF to get started</h3>
                <p className="text-[#8B8B8B] max-w-sm">
                  We&apos;ll extract the content, create a conversational script, and generate audio with multiple speakers
                </p>
                
                <div className="flex gap-4 mt-8">
                  <div className="flex items-center gap-2 text-sm text-[#8B8B8B]">
                    <div className="w-8 h-8 rounded-lg bg-[#C8D5B9] flex items-center justify-center">
                      <FileText className="h-4 w-4 text-[#2B2B2B]" />
                    </div>
                    <span>Extract</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#8B8B8B]">
                    <div className="w-8 h-8 rounded-lg bg-[#A8B8E8] flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-[#2B2B2B]" />
                    </div>
                    <span>Script</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#8B8B8B]">
                    <div className="w-8 h-8 rounded-lg bg-[#F5B57A] flex items-center justify-center">
                      <Volume2 className="h-4 w-4 text-[#2B2B2B]" />
                    </div>
                    <span>Audio</span>
                  </div>
                </div>
              </div>
            )}

            {(selectedFile || generatedScript) && (
              <ScriptDisplay
                script={generatedScript}
                isGenerating={loadingState?.step === 'script'}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E5] mt-12 lg:mt-16 py-6 lg:py-8 bg-white">
        <div className="container mx-auto px-4 lg:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-[#8B8B8B]">
            <Image
              src="https://dashboard.sarvam.ai/assets/sarvam-logo.png"
              alt="Sarvam"
              width={80}
              height={24}
              className="h-5 w-auto opacity-50"
            />
            <span>Podcast Generator</span>
          </div>
          <div className="text-xs sm:text-sm text-[#8B8B8B] text-center sm:text-right">
            Powered by Document Intelligence, Sarvam-M, and Text-to-Speech
          </div>
        </div>
      </footer>
    </div>
  );
}
