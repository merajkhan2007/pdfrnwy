'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { FileUploader } from '../FileUploader';
import { ProcessingProgress, ProcessingStatus } from '../ProcessingProgress';
import { DownloadButton } from '../DownloadButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { mergePDFs } from '@/lib/pdf';
import type { MergeOptions, ProcessOutput } from '@/types/pdf';
import { configurePdfjsWorker } from '@/lib/pdf/loader';

/**
 * Generate a unique ID for files
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export interface MergePDFToolProps {
  /** Custom class name */
  className?: string;
}

export interface MergeUploadedFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress?: number;
  error?: string;
  pageCount?: number;
  preview?: string;
}

const loadPDFMetadata = async (file: File): Promise<{ pageCount: number; thumbnailUrl: string }> => {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    configurePdfjsWorker(pdfjsLib);
    const url = URL.createObjectURL(file);
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;

    // Render first page as thumbnail
    const page = await pdf.getPage(1);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Scale for thumbnail (width 120px)
    const viewport = page.getViewport({ scale: 1.0 });
    const scale = 120 / viewport.width;
    const scaledViewport = page.getViewport({ scale });
    
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    
    if (context) {
      await page.render({
        canvasContext: context,
        viewport: scaledViewport
      }).promise;
    }
    
    const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
    URL.revokeObjectURL(url);
    
    return { pageCount, thumbnailUrl };
  } catch (err) {
    console.error('Failed to generate thumbnail for:', file.name, err);
    return { pageCount: 0, thumbnailUrl: '' };
  }
};

/**
 * MergePDFTool Component
 * Requirements: 5.1, 5.2
 * 
 * Provides the UI for merging multiple PDF files with drag-to-reorder functionality.
 */
export function MergePDFTool({ className = '' }: MergePDFToolProps) {
  const t = useTranslations('common');
  const tTools = useTranslations('tools');
  
  // State
  const [files, setFiles] = useState<MergeUploadedFile[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preserveBookmarks, setPreserveBookmarks] = useState(true);
  
  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Ref for cancellation
  const cancelledRef = useRef(false);

  /**
   * Handle files selected from uploader
   */
  const handleFilesSelected = useCallback((newFiles: File[]) => {
    const uploadedFiles: MergeUploadedFile[] = newFiles.map(file => ({
      id: generateId(),
      file,
      status: 'pending' as const,
    }));
    
    setFiles(prev => [...prev, ...uploadedFiles]);
    setError(null);
    setResult(null);

    // Asynchronously load page count & render first page thumbnail in background
    uploadedFiles.forEach(async (uploaded) => {
      const meta = await loadPDFMetadata(uploaded.file);
      setFiles(prev => prev.map(f => {
        if (f.id === uploaded.id) {
          return {
            ...f,
            status: 'complete' as const,
            preview: meta.thumbnailUrl || undefined,
            pageCount: meta.pageCount || 1,
          };
        }
        return f;
      }));
    });
  }, []);

  /**
   * Handle file upload error
   */
  const handleUploadError = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  /**
   * Remove a file from the list
   */
  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setResult(null);
  }, []);

  /**
   * Clear all files
   */
  const handleClearAll = useCallback(() => {
    setFiles([]);
    setResult(null);
    setError(null);
    setStatus('idle');
    setProgress(0);
  }, []);

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  /**
   * Handle drag over
   */
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      setFiles(prev => {
        const newFiles = [...prev];
        const [draggedFile] = newFiles.splice(draggedIndex, 1);
        newFiles.splice(dragOverIndex, 0, draggedFile);
        return newFiles;
      });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, dragOverIndex]);

  /**
   * Move file up in the list
   */
  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setFiles(prev => {
      const newFiles = [...prev];
      [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
      return newFiles;
    });
  }, []);

  /**
   * Move file down in the list
   */
  const handleMoveDown = useCallback((index: number) => {
    setFiles(prev => {
      if (index === prev.length - 1) return prev;
      const newFiles = [...prev];
      [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
      return newFiles;
    });
  }, []);

  /**
   * Handle merge operation
   */
  const handleMerge = useCallback(async () => {
    if (files.length < 2) {
      setError('Please add at least 2 PDF files to merge.');
      return;
    }

    cancelledRef.current = false;
    setStatus('processing');
    setProgress(0);
    setError(null);
    setResult(null);

    const options: MergeOptions = {
      preserveBookmarks,
      pageOrder: 'sequential',
    };

    try {
      const output: ProcessOutput = await mergePDFs(
        files.map(f => f.file),
        options,
        (prog, message) => {
          if (!cancelledRef.current) {
            setProgress(prog);
            setProgressMessage(message || '');
          }
        }
      );

      if (cancelledRef.current) {
        setStatus('idle');
        return;
      }

      if (output.success && output.result) {
        setResult(output.result as Blob);
        setStatus('complete');
      } else {
        setError(output.error?.message || 'Failed to merge PDF files.');
        setStatus('error');
      }
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        setStatus('error');
      }
    }
  }, [files, preserveBookmarks]);

  /**
   * Handle cancel operation
   */
  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    setStatus('idle');
    setProgress(0);
  }, []);

  /**
   * Format file size
   */
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isProcessing = status === 'processing' || status === 'uploading';
  const canMerge = files.length >= 2 && !isProcessing;

  return (
    <div className={`space-y-8 max-w-4xl mx-auto ${className}`.trim()}>
      {/* File Upload Area */}
      <FileUploader
        accept={['application/pdf', '.pdf']}
        multiple
        maxFiles={100}
        onFilesSelected={handleFilesSelected}
        onError={handleUploadError}
        disabled={isProcessing}
        label={tTools('mergePdf.uploadLabel') || 'Choose PDF Files'}
        description={tTools('mergePdf.uploadDescription') || 'Drag and drop PDF files here, or click to browse. You can add multiple files.'}
      />

      {/* Error Message */}
      {error && (
        <div 
          className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 font-semibold text-sm animate-in fade-in"
          role="alert"
        >
          <p>{error}</p>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white border border-[hsl(var(--color-border))]/60 rounded-[24px] p-6 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[hsl(var(--color-foreground))]">
              {tTools('mergePdf.filesTitle') || 'Files to Merge'} ({files.length})
            </h3>
          </div>

          <p className="text-xs font-semibold text-[hsl(var(--color-muted-foreground))] mb-6">
            {tTools('mergePdf.reorderHint') || 'Drag and drop to reorder files. Files will be merged in the order shown.'}
          </p>

          <ul className="space-y-3" role="list" aria-label="Files to merge">
            {files.map((file, index) => (
              <li
                key={file.id}
                draggable={!isProcessing}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-4 p-4 rounded-[24px] bg-white border
                  transition-all duration-300 shadow-sm hover:shadow-md
                  ${draggedIndex === index ? 'opacity-40 border-dashed border-[hsl(var(--color-primary))]' : 'border-[hsl(var(--color-border))]/60'}
                  ${dragOverIndex === index ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.03)] scale-[1.01]' : ''}
                  ${!isProcessing ? 'cursor-grab hover:border-[hsl(var(--color-primary))]/30' : ''}
                `}
              >
                {/* Drag Handle */}
                <div 
                  className="flex-shrink-0 text-[hsl(var(--color-muted-foreground))] cursor-grab active:cursor-grabbing hover:text-[hsl(var(--color-primary))] transition-colors p-1"
                  aria-hidden="true"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="6" r="1.5" />
                    <circle cx="15" cy="6" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" />
                    <circle cx="15" cy="12" r="1.5" />
                    <circle cx="9" cy="18" r="1.5" />
                    <circle cx="15" cy="18" r="1.5" />
                  </svg>
                </div>

                {/* Index Number */}
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[hsl(var(--color-primary))/0.1] text-[hsl(var(--color-primary))] text-xs font-extrabold flex items-center justify-center">
                  {index + 1}
                </span>

                {/* PDF Thumbnail / Loading state */}
                <div className="flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border border-[hsl(var(--color-border))]/80 bg-[hsl(var(--color-muted))/0.2] flex items-center justify-center relative shadow-sm">
                  {file.preview ? (
                    <img 
                      src={file.preview} 
                      alt={`Page 1 of ${file.file.name}`} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-white animate-pulse">
                      <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                        <div className="w-4 h-4 border-2 border-[hsl(var(--color-primary))] border-t-transparent rounded-full animate-spin" />
                      </div>
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[hsl(var(--color-foreground))] truncate">
                    {file.file.name}
                  </p>
                  <div className="text-xs text-[hsl(var(--color-muted-foreground))] flex flex-wrap items-center gap-2 mt-1.5 font-semibold">
                    <span>{formatSize(file.file.size)}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--color-border))]" />
                    <span>
                      {file.pageCount !== undefined ? `${file.pageCount} page${file.pageCount > 1 ? 's' : ''}` : 'Loading details...'}
                    </span>
                  </div>
                </div>

                {/* Reorder Buttons (Up/Down) */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0 || isProcessing}
                    className="p-1.5 rounded-lg hover:bg-[hsl(var(--color-muted))] hover:text-[hsl(var(--color-primary))] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Move up"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 15l-6-6-6 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === files.length - 1 || isProcessing}
                    className="p-1.5 rounded-lg hover:bg-[hsl(var(--color-muted))] hover:text-[hsl(var(--color-primary))] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Move down"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveFile(file.id)}
                  disabled={isProcessing}
                  className="flex-shrink-0 p-2 rounded-xl bg-gray-50 hover:bg-red-50 text-[hsl(var(--color-muted-foreground))] hover:text-red-500 transition-all border border-transparent hover:border-red-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  aria-label={`Remove ${file.file.name}`}
                >
                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Options Panel */}
      {files.length >= 2 && (
        <div className="bg-white border border-[hsl(var(--color-border))]/60 rounded-[24px] p-6 shadow-sm animate-in fade-in">
          <h3 className="text-lg font-bold text-[hsl(var(--color-foreground))] mb-4">
            {tTools('mergePdf.optionsTitle') || 'Merge Options'}
          </h3>
          
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="preserve-bookmarks"
              checked={preserveBookmarks}
              onChange={(e) => setPreserveBookmarks(e.target.checked)}
              disabled={isProcessing}
              aria-describedby="preserve-bookmarks-description"
              className="w-4.5 h-4.5 rounded-lg border-[hsl(var(--color-border))] text-[hsl(var(--color-primary))] focus:ring-[hsl(var(--color-primary))] cursor-pointer"
            />
            <span id="preserve-bookmarks-description" className="text-sm font-semibold text-[hsl(var(--color-foreground))]">
              {tTools('mergePdf.preserveBookmarks') || 'Preserve bookmarks (create bookmark for each file)'}
            </span>
          </label>
        </div>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <ProcessingProgress
          progress={progress}
          status={status}
          message={progressMessage}
          onCancel={handleCancel}
          showPercentage
        />
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
        {files.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={isProcessing}
            className="px-6 py-3.5 text-sm font-bold text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-foreground))] hover:bg-[hsl(var(--color-muted))] rounded-[var(--radius-md)] border border-[hsl(var(--color-border))]/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Clear All
          </button>
        )}
        
        <button
          onClick={handleMerge}
          disabled={!canMerge}
          className={`
            px-8 py-3.5 text-sm font-bold text-white rounded-[var(--radius-md)] shadow-md select-none transition-all flex items-center justify-center gap-2
            ${canMerge ? 'bg-primary-gradient btn-glow-hover cursor-pointer' : 'bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed opacity-60'}
          `}
        >
          {isProcessing ? (
            <>
              <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Merging PDFs ({progress}%)</span>
            </>
          ) : (
            <span>Merge PDFs</span>
          )}
        </button>

        {result && (
          <DownloadButton
            file={result}
            filename="merged.pdf"
            variant="secondary"
            size="lg"
            showFileSize
          />
        )}
      </div>

      {/* Success Message */}
      {status === 'complete' && result && (
        <div 
          className="p-4 rounded-[var(--radius-md)] bg-green-50 border border-green-200 text-green-700 font-semibold text-sm animate-in fade-in"
          role="status"
        >
          <p>
            {tTools('mergePdf.successMessage') || 'PDFs merged successfully! Click the download button to save your file.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default MergePDFTool;
