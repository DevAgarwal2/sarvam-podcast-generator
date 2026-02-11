'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Clock, AlertCircle, FileSpreadsheet, Presentation } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  isProcessing: boolean;
}

// Supported file extensions
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.pptx'];

// Check if file is supported
const isSupportedFile = (file: File): boolean => {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  return SUPPORTED_EXTENSIONS.includes(ext);
};

// Get file icon based on type
const getFileIcon = (filename: string) => {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  switch (ext) {
    case '.docx':
      return <FileText className="h-6 w-6 text-white" />;
    case '.pptx':
      return <Presentation className="h-6 w-6 text-white" />;
    case '.pdf':
    default:
      return <FileText className="h-6 w-6 text-white" />;
  }
};

// Get file type label
const getFileTypeLabel = (filename: string): string => {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  switch (ext) {
    case '.docx':
      return 'Word Document';
    case '.pptx':
      return 'PowerPoint';
    case '.pdf':
      return 'PDF Document';
    default:
      return 'Document';
  }
};

export function FileUpload({ onFileSelect, selectedFile, onClear, isProcessing }: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [pageCount, setPageCount] = useState<number | null>(null);

  const countPdfPages = async (file: File): Promise<number> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfString = new TextDecoder().decode(arrayBuffer.slice(0, 500000));
      
      const countMatch = pdfString.match(/\/Type\s*\/Pages[^\0]*\/Count\s+(\d+)/);
      if (countMatch) {
        return parseInt(countMatch[1], 10);
      }
      
      const countMatch2 = pdfString.match(/\/Count\s+(\d+)/);
      if (countMatch2) {
        return parseInt(countMatch2[1], 10);
      }
      
      const pageMatches = pdfString.match(/\/Type\s*\/Page\b/g);
      if (pageMatches && pageMatches.length > 0) {
        return Math.min(pageMatches.length, 1000);
      }
      
      const nMatch = pdfString.match(/\/N\s+(\d+)/);
      if (nMatch) {
        return parseInt(nMatch[1], 10);
      }
      
      const kidsMatch = pdfString.match(/\/Kids\s*\[([^\]]+)\]/);
      if (kidsMatch) {
        const refs = kidsMatch[1].match(/\d+\s+\d+\s+R/g);
        if (refs) return Math.min(refs.length, 1000);
      }
      
      return 1;
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
    if (files.length > 0 && isSupportedFile(files[0])) {
      const ext = files[0].name.toLowerCase().slice(files[0].name.lastIndexOf('.'));
      if (ext === '.pdf') {
        const pages = await countPdfPages(files[0]);
        setPageCount(pages);
      } else {
        setPageCount(null); // Office docs don't have easy page count
      }
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && isSupportedFile(files[0])) {
      const ext = files[0].name.toLowerCase().slice(files[0].name.lastIndexOf('.'));
      if (ext === '.pdf') {
        const pages = await countPdfPages(files[0]);
        setPageCount(pages);
      } else {
        setPageCount(null);
      }
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleClearFile = () => {
    setPageCount(null);
    onClear();
  };

  if (selectedFile) {
    const isLargeFile = pageCount !== null && pageCount > 5;
    const fileTypeLabel = getFileTypeLabel(selectedFile.name);
    
    return (
      <div className="space-y-3">
        <div className="bg-[#F8F6F3] rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#E88B7D] flex items-center justify-center flex-shrink-0">
              {getFileIcon(selectedFile.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#2B2B2B] truncate">{selectedFile.name}</p>
              <p className="text-sm text-[#8B8B8B]">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                {pageCount && ` • ${pageCount} pages`}
                {` • ${fileTypeLabel}`}
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
        accept=".pdf,.docx,.pptx"
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
          Drop file here or click to browse
        </p>
        <p className="text-sm text-[#8B8B8B]">
          Supports PDF, DOCX, and PPTX files up to 50MB
        </p>
      </label>
    </div>
  );
}
