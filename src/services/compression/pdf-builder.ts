import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib';
import type { CompressionOptions } from './types';

export class PdfBuilder {
  static async rebuild(
    pdfLibDoc: PDFDocument,
    optimizedImages: {
      ref: any;
      blob: Blob;
      width: number;
      height: number;
      filter: string;
    }[],
    options: CompressionOptions
  ): Promise<Uint8Array> {
    
    // 1. Substitute raw image streams in the PDF indirect object map
    for (const optImage of optimizedImages) {
      const indirectObj = pdfLibDoc.context.lookup(optImage.ref);
      if (!(indirectObj instanceof PDFRawStream)) continue;

      const arrayBuffer = await optImage.blob.arrayBuffer();
      const newBytes = new Uint8Array(arrayBuffer);

      // Update dictionary headers
      const dict = indirectObj.dict;
      dict.set(PDFName.of('Filter'), PDFName.of(optImage.filter));
      dict.set(PDFName.of('Width'), PDFNumber.of(optImage.width));
      dict.set(PDFName.of('Height'), PDFNumber.of(optImage.height));
      dict.set(PDFName.of('Length'), PDFNumber.of(newBytes.length));

      // Re-assign the new stream object back to the indirect reference in context
      const newStream = PDFRawStream.of(dict, newBytes);
      pdfLibDoc.context.assign(optImage.ref, newStream);
    }

    // 2. Remove Metadata
    if (options.removeMetadata) {
      pdfLibDoc.setTitle('');
      pdfLibDoc.setAuthor('');
      pdfLibDoc.setSubject('');
      pdfLibDoc.setKeywords([]);
      pdfLibDoc.setProducer('');
      pdfLibDoc.setCreator('');
      
      const catalog = pdfLibDoc.catalog;
      catalog.delete(PDFName.of('Metadata'));
      catalog.delete(PDFName.of('PieceInfo'));
    }

    // 3. Remove Thumbnails
    if (options.removeThumbnails) {
      const pages = pdfLibDoc.getPages();
      for (const page of pages) {
        page.node.delete(PDFName.of('Thumb'));
      }
    }

    // 4. Flatten Annotations / Form Fields
    if (options.flattenAnnotations) {
      try {
        const form = pdfLibDoc.getForm();
        form.flatten();
      } catch (err) {
        console.warn('Form flattening skipped:', err);
      }
      
      const pages = pdfLibDoc.getPages();
      for (const page of pages) {
        // Option to strip annots dictionary entirely if flattening requested
        page.node.delete(PDFName.of('Annots'));
      }
    }

    // 5. Save with optimizations
    const saveOptions = {
      useObjectStreams: options.optimizeObjectStreams ?? true,
      addEmptyPage: false,
    };

    return await pdfLibDoc.save(saveOptions);
  }
}
