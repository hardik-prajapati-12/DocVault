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
        const widthRaw = pdfLibDoc.context.lookup(dict.get(PDFName.of('Width')));
        const heightRaw = pdfLibDoc.context.lookup(dict.get(PDFName.of('Height')));
        
        const width = (widthRaw as any)?.asNumber ? (widthRaw as any).asNumber() : Number(widthRaw || 0);
        const height = (heightRaw as any)?.asNumber ? (heightRaw as any).asNumber() : Number(heightRaw || 0);
        
        if (!width || !height || width <= 0 || height <= 0) continue;

        const filterRaw = pdfLibDoc.context.lookup(dict.get(PDFName.of('Filter')));
        
        let filterName = 'Raw';
        if (filterRaw instanceof PDFName) {
          filterName = filterRaw.value() || 'Raw';
        } else if (Array.isArray(filterRaw)) {
          filterName = filterRaw.map(f => f instanceof PDFName ? (f.value() || '') : '').join(',');
        }

        const smaskRef = dict.get(PDFName.of('SMask'));
        const hasAlpha = smaskRef instanceof PDFRef || !!pdfLibDoc.context.lookup(smaskRef);
        
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
          // DCTDecode is JPEG, create Blob safely using Uint8Array slice
          const safeBytes = new Uint8Array(contents.buffer as ArrayBuffer, contents.byteOffset, contents.byteLength);
          blob = new Blob([safeBytes as unknown as BlobPart], { type: 'image/jpeg' });
          mimeType = 'image/jpeg';
        } else {
          // FlateDecode or Raw pixel stream: decode to canvas
          let colorSpaceObj = pdfLibDoc.context.lookup(dict.get(PDFName.of('ColorSpace')));
          let isRGB = false;
          let isGray = false;

          if (colorSpaceObj === PDFName.of('DeviceRGB')) {
            isRGB = true;
          } else if (colorSpaceObj === PDFName.of('DeviceGray')) {
            isGray = true;
          } else if (Array.isArray(colorSpaceObj) || (colorSpaceObj && 'array' in (colorSpaceObj as any))) {
            const csArray = colorSpaceObj as any;
            const firstElement = csArray.get ? csArray.get(0) : csArray[0];
            if (firstElement === PDFName.of('ICCBased')) {
              const iccRef = csArray.get ? csArray.get(1) : csArray[1];
              const iccStream = pdfLibDoc.context.lookup(iccRef);
              if (iccStream && (iccStream as any).dict) {
                const n = ((iccStream as any).dict.get(PDFName.of('N')) as any)?.asNumber?.() || 3;
                if (n === 1) isGray = true;
                else isRGB = true;
              } else {
                isRGB = true;
              }
            } else if (firstElement === PDFName.of('DeviceRGB')) {
              isRGB = true;
            } else if (firstElement === PDFName.of('DeviceGray')) {
              isGray = true;
            }
          }

          // Heuristic fallback if color space could not be parsed explicitly
          if (!isRGB && !isGray) {
            if (contents.length >= width * height * 3) {
              isRGB = true;
            } else if (contents.length >= width * height) {
              isGray = true;
            }
          }
          
          let alphaBytes: Uint8Array | undefined;
          if (smaskRef instanceof PDFRef) {
            const smaskObj = pdfLibDoc.context.lookup(smaskRef);
            if (smaskObj instanceof PDFRawStream) {
              const smaskCompressed = smaskObj.getContents();
              try {
                alphaBytes = unzlibSync(smaskCompressed);
              } catch {
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
