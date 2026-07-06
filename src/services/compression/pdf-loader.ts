import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

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
