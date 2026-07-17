import * as pdfjsLib from 'pdfjs-dist';

export interface PageMetadata {
  pageIndex: number;
  width: number;
  height: number;
  rotation: number;
  hasText: boolean;
  fonts: string[];
  imageCount: number;
  vectorCount: number;
}

export class PageAnalyzer {
  static async analyze(pdfjsDoc: pdfjsLib.PDFDocumentProxy): Promise<PageMetadata[]> {
    const pageCount = pdfjsDoc.numPages;
    const pageMetas: PageMetadata[] = [];

    // OPS enum helper
    const OPS = (pdfjsLib as any).OPS || {};

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdfjsDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });

      // Detect text content
      const textContent = await page.getTextContent();
      const hasText = textContent.items.length > 0;

      // Extract fonts
      const fontSet = new Set<string>();
      textContent.items.forEach((item: any) => {
        if (item.fontName) fontSet.add(item.fontName);
      });

      // Analyze page operator list to detect vector vs raster image counts
      let imageCount = 0;
      let vectorCount = 0;

      try {
        const opList = await page.getOperatorList();
        
        // Scan operators
        for (let j = 0; j < opList.fnArray.length; j++) {
          const fnCode = opList.fnArray[j];
          
          // Image drawing operators
          if (
            fnCode === OPS.paintImageXObject ||
            fnCode === OPS.paintJpegXObject ||
            fnCode === OPS.paintImageMaskXObject ||
            fnCode === OPS.paintImageXObjectRepeat
          ) {
            imageCount++;
          }
          
          // Vector path operators (constructPath, stroke, fill, etc.)
          if (
            fnCode === OPS.constructPath ||
            fnCode === OPS.stroke ||
            fnCode === OPS.fill ||
            fnCode === OPS.eoFill ||
            fnCode === OPS.fillStroke ||
            fnCode === OPS.eoFillStroke
          ) {
            vectorCount++;
          }
        }
      } catch (err) {
        console.warn(`Operator list parsing failed for page ${i}:`, err);
      }

      pageMetas.push({
        pageIndex: i - 1,
        width: viewport.width,
        height: viewport.height,
        rotation: page.rotate,
        hasText,
        fonts: Array.from(fontSet),
        imageCount,
        vectorCount,
      });
    }

    return pageMetas;
  }
}
