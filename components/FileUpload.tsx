'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Clock, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  isProcessing: boolean;
}

export function FileUpload({ onFileSelect, selectedFile, onClear, isProcessing }: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [pageCount, setPageCount] = useState<number | null>(null);

  const countPdfPages = async (file: File): Promise<number> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfString = new TextDecoder().decode(arrayBuffer.slice(0, 100000));
      
      // Try to find /Count in PDF
      const countMatch = pdfString.match(/\/Type\s*\/Pages[^\0]*\/Count\s+(\d+)/);
      if (countMatch) {
        return parseInt(countMatch[1], 10);
      }
      
      // Fallback: count /Page references
      const pageMatches = pdfString.match(/\/Type\s*\/Page\s*(\/|$)/g);
      return pageMatches ? Math.min(pageMatches.length, 1000) : 1;
    } catch {
      return 1;
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      const pages = await countPdfPages(files[0]);
      setPageCount(pages);
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const pages = await countPdfPages(files[0]);
      setPageCount(pages);
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleClearFile = () => {
    setPageCount(null);
    onClear();
  };

  if (selectedFile) {
    const isLargeFile = pageCount !== null && pageCount > 5;
    
    return (
      <div className="space-y-3">
        <div className="bg-[#F8F6F3] rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#E88B7D] flex items-center justify-center flex-shrink-0">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#2B2B2B] truncate">{selectedFile.name}</p>
              <p className="text-sm text-[#8B8B8B]">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                {pageCount && ` • ${pageCount} pages`}
              </p>
            </div>
            {!isProcessing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearFile}
                className="text-[#8B8B8B] hover:text-[#E88B7D] hover:bg-[#E88B7D]/10 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {isLargeFile && (
          <div className="flex items-start gap-3 p-4 bg-[#F5B57A]/10 border border-[#F5B57A]/30 rounded-xl">
            <Clock className="h-5 w-5 text-[#F5B57A] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#2B2B2B]">
                Large document detected
              </p>
              <p className="text-sm text-[#8B8B8B] mt-1">
                This {pageCount}-page PDF will take longer to process (2-5 minutes). 
                Please be patient while we extract and analyze the content.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
        ${isDragActive ? 'border-[#2B2B2B] bg-[#F8F6F3]' : 'border-[#E5E5E5] bg-white'}
        ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#2B2B2B] hover:bg-[#F8F6F3]'}
      `}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        disabled={isProcessing}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer block">
        <div className="w-16 h-16 rounded-2xl bg-[#F8F6F3] flex items-center justify-center mx-auto mb-4">
          <Upload className="h-8 w-8 text-[#8B8B8B]" />
        </div>
        <p className="text-lg font-medium text-[#2B2B2B] mb-1">
          Drop PDF here or click to browse
        </p>
        <p className="text-sm text-[#8B8B8B]">
          Supports PDF files up to 50MB
        </p>
      </label>
    </div>
  );
}
