import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
if (!pdfjsLib.GlobalWorkerOptions.workerPort && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  if (typeof window !== 'undefined' && 'Worker' in window) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
        new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url),
        { type: 'module' }
      );
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
    }
  } else {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  }
}

export interface LoadedPdf {
  pdfLibDoc: PDFDocument;
  pdfjsDoc: pdfjsLib.PDFDocumentProxy;
  arrayBuffer: ArrayBuffer;
}

export class PdfLoader {
  static async load(blob: Blob): Promise<LoadedPdf> {
    const arrayBuffer = await blob.arrayBuffer();
    
    // Load with pdf-lib for object-level tree edits
    const pdfLibDoc = await PDFDocument.load(arrayBuffer, {
      updateMetadata: false,
      ignoreEncryption: true,
    });

    // Load with pdfjs-dist for rendering and metadata inspections
    const pdfjsDoc = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    }).promise;

    return {
      pdfLibDoc,
      pdfjsDoc,
      arrayBuffer,
    };
  }
}
