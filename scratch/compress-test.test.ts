import { describe, it, expect, vi } from 'vitest';
import { CompressPDFProcessor, createCompressProcessor, compressPDF } from '../src/lib/pdf/processors/compress';
import { PDFErrorCode } from '../src/types/pdf';

// Helper to create a real minimal PDF using pdf-lib
async function createRealPDFFile(name: string, pageCount: number = 1): Promise<File> {
  const { PDFDocument } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  
  for (let i = 0; i < pageCount; i++) {
    pdfDoc.addPage([612, 792]); // Letter size
  }
  
  const pdfBytes = await pdfDoc.save();
  
  // Create a proper ArrayBuffer from the Uint8Array
  const arrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer;
  
  // Create a File object with proper methods for jsdom compatibility
  const file = new File([arrayBuffer], name, { type: 'application/pdf' });
  
  // Polyfill arrayBuffer method if not available in jsdom
  if (typeof file.arrayBuffer !== 'function') {
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => arrayBuffer,
      writable: false,
    });
  }
  
  return file;
}

describe('CompressPDFProcessor in JSDOM', () => {
  it('should attempt standard compression', async () => {
    const file = await createRealPDFFile('sample.pdf', 1);
    const processor = createCompressProcessor();
    
    console.log('Starting compression processing...');
    try {
      const result = await processor.process({
        files: [file],
        options: {
          algorithm: 'standard', // Use standard/worker
          quality: 'medium',
          optimizeImages: false,
        }
      });
      console.log('Result:', result);
      expect(result.success).toBe(true);
    } catch (e) {
      console.error('Error caught in test:', e);
      throw e;
    }
  });

  it('should attempt condense compression', async () => {
    const file = await createRealPDFFile('sample.pdf', 1);
    const processor = createCompressProcessor();
    
    console.log('Starting condense compression processing...');
    try {
      const result = await processor.process({
        files: [file],
        options: {
          algorithm: 'condense', // Use PyMuPDF
          quality: 'medium',
        }
      });
      console.log('Result:', result);
      expect(result.success).toBe(true);
    } catch (e) {
      console.error('Error caught in test:', e);
      throw e;
    }
  });
});
