import { PDFDocument, PDFRawStream, PDFName, PDFRef, PDFDict } from 'pdf-lib';
import { unzlibSync } from 'fflate';

export interface ExtractedImage {
  ref: PDFRef;
  width: number;
  height: number;
  originalSize: number;
  mimeType: string;
  blob: Blob;
  hasAlpha: boolean;
  filterName: string;
}

export class ImageExtractor {
  static async extractAll(pdfLibDoc: PDFDocument): Promise<ExtractedImage[]> {
    const extractedImages: ExtractedImage[] = [];
    const visitedRefs = new Set<string>();

    const indirectObjects = pdfLibDoc.context.enumerateIndirectObjects();

    for (const [ref, obj] of indirectObjects) {
      if (!(obj instanceof PDFRawStream)) continue;

      const dict = obj.dict;
      const subtype = dict.get(PDFName.of('Subtype'));
      if (subtype !== PDFName.of('Image')) continue;

      const refStr = `${ref.objectNumber}-${ref.generationNumber}`;
      if (visitedRefs.has(refStr)) continue;
      visitedRefs.add(refStr);

      try {
        const width = (dict.get(PDFName.of('Width')) as any).asNumber();
        const height = (dict.get(PDFName.of('Height')) as any).asNumber();
        const filter = dict.get(PDFName.of('Filter'));
        
        let filterName = 'Raw';
        if (filter instanceof PDFName) {
          filterName = filter.value() || 'Raw';
        } else if (Array.isArray(filter)) {
          // If there are multiple filters (e.g. [/A85 /DCTDecode])
          filterName = filter.map(f => f instanceof PDFName ? (f.value() || '') : '').join(',');
        }

        const smaskRef = dict.get(PDFName.of('SMask'));
        const hasAlpha = smaskRef instanceof PDFRef;
        
        const compressedBytes = obj.getContents();
        let contents = compressedBytes;
        if (filterName.includes('FlateDecode')) {
          try {
            contents = unzlibSync(compressedBytes);
          } catch (zlibErr) {
            console.warn('fflate unzlib failed, using raw contents:', zlibErr);
          }
        }
        
        const originalSize = contents.length;
        
        let mimeType = 'image/jpeg';
        let blob: Blob;

        if (filterName.includes('DCTDecode')) {
          // DCTDecode is JPEG, we can use the bytes directly
          blob = new Blob([contents.buffer as ArrayBuffer], { type: 'image/jpeg' });
          mimeType = 'image/jpeg';
        } else {
          // FlateDecode or Raw pixel stream: decode to canvas
          const colorSpace = dict.get(PDFName.of('ColorSpace'));
          let isRGB = colorSpace === PDFName.of('DeviceRGB');
          let isGray = colorSpace === PDFName.of('DeviceGray');
          
          let alphaBytes: Uint8Array | undefined;
          if (smaskRef instanceof PDFRef) {
            const smaskObj = pdfLibDoc.context.lookup(smaskRef);
            if (smaskObj instanceof PDFRawStream) {
              const smaskCompressed = smaskObj.getContents();
              try {
                alphaBytes = unzlibSync(smaskCompressed);
              } catch (zlibErr) {
                alphaBytes = smaskCompressed;
              }
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          const imgData = ctx.createImageData(width, height);
          const data = imgData.data;

          let byteIdx = 0;
          for (let pixelIdx = 0; pixelIdx < width * height; pixelIdx++) {
            let r = 255, g = 255, b = 255, a = 255;

            if (isRGB && byteIdx + 2 < contents.length) {
              r = contents[byteIdx++];
              g = contents[byteIdx++];
              b = contents[byteIdx++];
            } else if (isGray && byteIdx < contents.length) {
              const gray = contents[byteIdx++];
              r = g = b = gray;
            } else if (byteIdx < contents.length) {
              // Fallback for CMYK or other spaces
              const v = contents[byteIdx++];
              r = g = b = v;
            }

            if (alphaBytes && pixelIdx < alphaBytes.length) {
              a = alphaBytes[pixelIdx];
            }

            const outIdx = pixelIdx * 4;
            data[outIdx] = r;
            data[outIdx + 1] = g;
            data[outIdx + 2] = b;
            data[outIdx + 3] = a;
          }

          ctx.putImageData(imgData, 0, 0);
          mimeType = hasAlpha ? 'image/png' : 'image/jpeg';
          blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b || new Blob()), mimeType);
          });
        }

        extractedImages.push({
          ref,
          width,
          height,
          originalSize,
          mimeType,
          blob,
          hasAlpha,
          filterName,
        });
      } catch (err) {
        console.warn(`Failed to extract image object ${refStr}:`, err);
      }
    }

    return extractedImages;
  }
}
