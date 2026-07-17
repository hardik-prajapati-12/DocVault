import React, { useState, useRef } from 'react';
import { 
  FileText, Image, RefreshCw, FileCode, ArrowLeftRight, 
  Upload, Download, ArrowLeft, Loader2, FileSpreadsheet, Copy, Check 
} from 'lucide-react';
import { Button } from '@/components/ui';
import { PDFDocument, PDFName, PDFNumber, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { zipSync, unzipSync } from 'fflate';
import { formatBytes } from '@/utils';

type ConverterTool = 
  | 'pdf-to-img' 
  | 'img-to-pdf' 
  | 'pdf-to-text' 
  | 'csv-json' 
  | 'md-html' 
  | 'docx-pdf' 
  | 'pdf-docx' 
  | 'xlsx-pdf' 
  | 'pdf-xlsx';

interface ToolCard {
  id: ConverterTool;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

const tools: ToolCard[] = [
  {
    id: 'pdf-to-img',
    title: 'PDF to Images',
    description: 'Extract pages from a PDF document as PNG or JPEG images.',
    icon: Image,
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'img-to-pdf',
    title: 'Images to PDF',
    description: 'Convert multiple PNG, JPEG, or WebP images into a single PDF.',
    icon: FileText,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'pdf-to-text',
    title: 'PDF to Text',
    description: 'Extract raw text layouts from PDF pages into a plaintext document.',
    icon: FileText,
    color: 'from-purple-500 to-pink-600',
  },
  {
    id: 'docx-pdf',
    title: 'Word to PDF',
    description: 'Convert Word document (.docx) paragraphs and text into PDF format.',
    icon: FileText,
    color: 'from-sky-500 to-blue-600',
  },
  {
    id: 'pdf-docx',
    title: 'PDF to Word',
    description: 'Convert PDF text layouts into an editable Microsoft Word document.',
    icon: FileText,
    color: 'from-indigo-500 to-blue-700',
  },
  {
    id: 'xlsx-pdf',
    title: 'Excel to PDF',
    description: 'Convert Excel spreadsheets (.xlsx) cell data grids into PDF page tables.',
    icon: FileSpreadsheet,
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'pdf-xlsx',
    title: 'PDF to Excel',
    description: 'Extract tabular PDF layouts into an Excel-compatible spreadsheet.',
    icon: FileSpreadsheet,
    color: 'from-teal-500 to-green-600',
  },
  {
    id: 'csv-json',
    title: 'CSV ↔ JSON',
    description: 'Convert raw CSV tabular data rows into JSON format and vice versa.',
    icon: ArrowLeftRight,
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'md-html',
    title: 'Markdown ↔ HTML',
    description: 'Convert Markdown syntax documents to HTML markup and vice versa.',
    icon: FileCode,
    color: 'from-rose-500 to-red-600',
  },
];

export default function ConverterPage() {
  const [activeTool, setActiveTool] = useState<ConverterTool | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textOutput, setTextOutput] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(textOutput);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 1. PDF to Images
  const handlePdfToImg = async (imageType: 'png' | 'jpeg') => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgressText('Loading PDF document...');
    
    try {
      const file = files[0];
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const numPages = pdf.numPages;
      const zipData: { [key: string]: Uint8Array } = {};

      for (let i = 1; i <= numPages; i++) {
        setProgressText(`Rendering page ${i} of ${numPages}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;

        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b || new Blob()), `image/${imageType}`);
        });

        const imageBuffer = await blob.arrayBuffer();
        zipData[`page_${i}.${imageType}`] = new Uint8Array(imageBuffer);
      }

      setProgressText('Creating ZIP archive...');
      const zipped = zipSync(zipData);
      const zipBlob = new Blob([zipped.buffer as ArrayBuffer], { type: 'application/zip' });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.pdf$/i, '')}_images.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Conversion failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Images to PDF
  const handleImgToPdf = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgressText('Compiling PDF from images...');

    try {
      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        setProgressText(`Embedding image ${i + 1} of ${files.length}...`);
        const file = files[i];
        const bytes = await file.arrayBuffer();
        
        let imageObj;
        if (file.type === 'image/png') {
          imageObj = await pdfDoc.embedPng(bytes);
        } else {
          imageObj = await pdfDoc.embedJpg(bytes);
        }

        const page = pdfDoc.addPage([imageObj.width, imageObj.height]);
        page.drawImage(imageObj, {
          x: 0,
          y: 0,
          width: imageObj.width,
          height: imageObj.height,
        });
      }

      setProgressText('Writing PDF output...');
      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `images_converted.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`PDF compilation failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. PDF to Text
  const handlePdfToText = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgressText('Extracting PDF text...');

    try {
      const file = files[0];
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const numPages = pdf.numPages;
      let textOut = '';

      for (let i = 1; i <= numPages; i++) {
        setProgressText(`Reading page ${i} of ${numPages}...`);
        const page = await pdf.getPage(i);
        const textContext = await page.getTextContent();
        
        // Arrange lines roughly by vertical coordinates
        const items = textContext.items as any[];
        items.sort((a, b) => b.transform[5] - a.transform[5]);
        
        let currentY = -1;
        let pageText = '';
        for (const item of items) {
          if (currentY !== -1 && Math.abs(item.transform[5] - currentY) > 5) {
            pageText += '\n';
          }
          pageText += item.str + ' ';
          currentY = item.transform[5];
        }
        
        textOut += `--- PAGE ${i} ---\n${pageText}\n\n`;
      }

      setTextOutput(textOut);
    } catch (err: any) {
      alert(`Text extraction failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Word (.docx) to PDF
  const handleDocxToPdf = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgressText('Unzipping DOCX structure...');

    try {
      const file = files[0];
      const buffer = await file.arrayBuffer();
      const unzipped = unzipSync(new Uint8Array(buffer));
      
      const docXmlBytes = unzipped['word/document.xml'];
      if (!docXmlBytes) throw new Error('Invalid DOCX: missing document.xml');

      const xmlText = new TextDecoder().decode(docXmlBytes);
      
      // Basic XML text extraction matching <w:t> tags
      const paragraphs: string[] = [];
      const pMatches = xmlText.matchAll(/<w:p\b[^>]*>(.*?)<\/w:p>/g);
      for (const pMatch of pMatches) {
        let pText = '';
        const tMatches = pMatch[1].matchAll(/<w:t\b[^>]*>(.*?)<\/w:t>/g);
        for (const tMatch of tMatches) {
          pText += tMatch[1];
        }
        if (pText.trim()) {
          paragraphs.push(pText);
        }
      }

      setProgressText('Drawing text onto PDF...');
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      let page = pdfDoc.addPage([612, 792]); // letter size
      let y = 740;

      for (const para of paragraphs) {
        if (y < 80) {
          page = pdfDoc.addPage([612, 792]);
          y = 740;
        }

        // Simple text wrap
        const words = para.split(' ');
        let line = '';
        for (const word of words) {
          const testLine = line + word + ' ';
          const width = font.widthOfTextAtSize(testLine, 11);
          if (width > 500 && line) {
            page.drawText(line, { x: 50, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) });
            y -= 16;
            line = word + ' ';
            if (y < 80) {
              page = pdfDoc.addPage([612, 792]);
              y = 740;
            }
          } else {
            line = testLine;
          }
        }
        if (line) {
          page.drawText(line, { x: 50, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) });
          y -= 24; // paragraph gap
        }
      }

      setProgressText('Writing PDF output...');
      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.docx$/i, '')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Word to PDF conversion failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. PDF to Word
  const handlePdfToDocx = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgressText('Extracting PDF text paragraphs...');

    try {
      const file = files[0];
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const numPages = pdf.numPages;
      const paragraphs: string[] = [];

      for (let i = 1; i <= numPages; i++) {
        setProgressText(`Parsing page ${i} of ${numPages}...`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];
        items.sort((a, b) => b.transform[5] - a.transform[5]);

        let currentY = -1;
        let currentP = '';
        for (const item of items) {
          if (currentY !== -1 && Math.abs(item.transform[5] - currentY) > 8) {
            if (currentP.trim()) {
              paragraphs.push(currentP.trim());
            }
            currentP = '';
          }
          currentP += item.str + ' ';
          currentY = item.transform[5];
        }
        if (currentP.trim()) {
          paragraphs.push(currentP.trim());
        }
      }

      setProgressText('Packaging DOCX file...');
      
      // Minimal Word Document openXML template mapping paragraphs
      const bodyXml = paragraphs
        .map((p) => `<w:p><w:r><w:t>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t></w:r></w:p>`)
        .join('');

      const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
    <w:sectPr/>
  </w:body>
</w:document>`;

      const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

      const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

      const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

      const zipFiles = {
        '[Content_Types].xml': new TextEncoder().encode(contentTypesXml),
        '_rels/.rels': new TextEncoder().encode(relsXml),
        'word/document.xml': new TextEncoder().encode(docXml),
        'word/_rels/document.xml.rels': new TextEncoder().encode(docRelsXml),
      };

      const zipped = zipSync(zipFiles);
      const docxBlob = new Blob([zipped.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.pdf$/i, '')}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`PDF to Word conversion failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. Excel (.xlsx) to PDF
  const handleXlsxToPdf = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgressText('Extracting Excel sheet grid...');

    try {
      const file = files[0];
      const buffer = await file.arrayBuffer();
      const unzipped = unzipSync(new Uint8Array(buffer));

      // Shared strings values
      let sharedStrings: string[] = [];
      const stringsBytes = unzipped['xl/sharedStrings.xml'];
      if (stringsBytes) {
        const text = new TextDecoder().decode(stringsBytes);
        const matches = text.matchAll(/<t\b[^>]*>(.*?)<\/t>/g);
        for (const m of matches) {
          sharedStrings.push(m[1]);
        }
      }

      // Read cells from Sheet1
      const sheetBytes = unzipped['xl/worksheets/sheet1.xml'];
      if (!sheetBytes) throw new Error('Missing worksheet sheet1.xml');
      const sheetXml = new TextDecoder().decode(sheetBytes);

      const rows: { [rowNum: number]: { [colName: string]: string } } = {};
      const rowMatches = sheetXml.matchAll(/<row\b[^>]*>(.*?)<\/row>/g);

      for (const rMatch of rowMatches) {
        const cMatches = rMatch[1].matchAll(/<c r="([A-Z]+)(\d+)"(?:\st="(\w+)")?>(.*?)<\/c>/g);
        for (const cMatch of cMatches) {
          const col = cMatch[1];
          const rowNum = parseInt(cMatch[2]);
          const type = cMatch[3];
          const innerXml = cMatch[4];
          
          let val = '';
          const vMatch = innerXml.match(/<v>(.*?)<\/v>/);
          if (vMatch) {
            const rawVal = vMatch[1];
            if (type === 's') {
              val = sharedStrings[parseInt(rawVal)] || '';
            } else {
              val = rawVal;
            }
          }
          if (!rows[rowNum]) rows[rowNum] = {};
          rows[rowNum][col] = val;
        }
      }

      setProgressText('Formatting layout on PDF sheet tables...');
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const page = pdfDoc.addPage([792, 612]); // Landscape letter for grids
      let y = 540;

      // Draw grid
      const sortedRows = Object.keys(rows).map(Number).sort((a, b) => a - b);
      for (const rowNum of sortedRows) {
        if (y < 50) break; // page limit for grid preview
        const cols = Object.keys(rows[rowNum]).sort();
        let x = 50;
        for (const col of cols) {
          const text = rows[rowNum][col];
          page.drawText(text, { x, y, size: 9, font, color: rgb(0.15, 0.15, 0.15) });
          // cell boundary
          page.drawRectangle({
            x: x - 4,
            y: y - 4,
            width: 80,
            height: 18,
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 0.5,
          });
          x += 85;
          if (x > 730) break;
        }
        y -= 22;
      }

      setProgressText('Generating PDF document...');
      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.xlsx$/i, '')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Excel to PDF conversion failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 7. PDF to Excel
  const handlePdfToXlsx = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgressText('Analyzing tables from PDF...');

    try {
      const file = files[0];
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const numPages = pdf.numPages;

      let csvText = '';

      for (let i = 1; i <= numPages; i++) {
        setProgressText(`Analyzing grid alignment on page ${i} of ${numPages}...`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];

        // Group text items by Y coordinate to build grid rows
        const tolerance = 5;
        const rowBuckets: { y: number; items: any[] }[] = [];
        for (const item of items) {
          const y = item.transform[5];
          let bucket = rowBuckets.find(b => Math.abs(b.y - y) < tolerance);
          if (!bucket) {
            bucket = { y, items: [] };
            rowBuckets.push(bucket);
          }
          bucket.items.push(item);
        }

        // Sort rows top-down
        rowBuckets.sort((a, b) => b.y - a.y);

        for (const row of rowBuckets) {
          // Sort columns left-to-right
          row.items.sort((a, b) => a.transform[4] - b.transform[4]);
          const colsText = row.items.map(it => `"${it.str.replace(/"/g, '""')}"`);
          csvText += colsText.join(',') + '\n';
        }
      }

      setProgressText('Compiling Spreadsheet output...');
      const csvBlob = new Blob([new TextEncoder().encode(csvText).buffer as ArrayBuffer], { type: 'text/csv' });
      
      const url = URL.createObjectURL(csvBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.pdf$/i, '')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`PDF to spreadsheet failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 8. CSV ↔ JSON
  const handleCsvJson = () => {
    try {
      if (textInput.trim().startsWith('[') || textInput.trim().startsWith('{')) {
        // JSON to CSV
        const parsed = JSON.parse(textInput);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        if (arr.length === 0) {
          setTextOutput('');
          return;
        }
        const headers = Object.keys(arr[0]);
        const rows = arr.map((item) =>
          headers.map((h) => `"${String(item[h] ?? '').replace(/"/g, '""')}"`).join(',')
        );
        setTextOutput([headers.join(','), ...rows].join('\n'));
      } else {
        // CSV to JSON
        const lines = textInput.split('\n').filter((l) => l.trim());
        if (lines.length === 0) {
          setTextOutput('');
          return;
        }
        const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
        const result = lines.slice(1).map((line) => {
          const cells = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          const obj: { [key: string]: string } = {};
          headers.forEach((h, idx) => {
            obj[h] = cells[idx] ?? '';
          });
          return obj;
        });
        setTextOutput(JSON.stringify(result, null, 2));
      }
    } catch (err: any) {
      alert(`JSON/CSV Parsing failed: ${err.message}`);
    }
  };

  // 9. Markdown ↔ HTML
  const handleMdHtml = () => {
    try {
      if (textInput.trim().startsWith('<')) {
        // HTML to Markdown
        let md = textInput
          .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n')
          .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n')
          .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n')
          .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
          .replace(/<strong>(.*?)<\/strong>|<b>(.*?)<\/b>/gi, '**$1$2**')
          .replace(/<em>(.*?)<\/em>|<i>(.*?)<\/i>/gi, '*$1$2*')
          .replace(/<a\shref="(.*?)">(.*?)<\/a>/gi, '[$2]($1)')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<li>(.*?)<\/li>/gi, '- $1\n');
        
        // Strip other tags
        md = md.replace(/<[^>]*>/g, '');
        setTextOutput(md.trim());
      } else {
        // Markdown to HTML
        let html = textInput
          .replace(/^#\s+(.*?)$/gm, '<h1>$1</h1>')
          .replace(/^##\s+(.*?)$/gm, '<h2>$2</h2>')
          .replace(/^###\s+(.*?)$/gm, '<h3>$3</h3>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
          .replace(/^\-\s+(.*?)$/gm, '<li>$1</li>')
          .replace(/\n\n/g, '<br/>');

        setTextOutput(html.trim());
      }
    } catch (err: any) {
      alert(`Markup Parsing failed: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto min-h-screen text-[var(--text-primary)]">
      {/* Page Header */}
      {!activeTool ? (
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            File Converter Hub
          </h1>
          <p className="text-[var(--text-secondary)] text-sm max-w-2xl">
            Convert standard file formats, spreadsheets, Word paragraphs, and text markups completely offline.
          </p>
          
          {/* Card grid list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
            {tools.map((t) => {
              const Icon = t.icon;
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setActiveTool(t.id);
                    setFiles([]);
                    setTextInput('');
                    setTextOutput('');
                  }}
                  className="group relative p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]/75 hover:border-[var(--accent)] transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col space-y-4"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center text-white shadow-sm`}>
                    <Icon className="w-5.5 h-5.5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm tracking-wide group-hover:text-[var(--accent)] transition-colors">
                      {t.title}
                    </h3>
                    <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                      {t.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Workspace Area for Selected Tool
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTool(null)}
              className="p-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-xl font-bold">{tools.find((t) => t.id === activeTool)?.title}</h2>
              <p className="text-xs text-[var(--text-tertiary)]">Convert files fully offline and secure.</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm space-y-6">
            {/* Context A: Text Area converters (CSV/JSON/Markdown) */}
            {['csv-json', 'md-html'].includes(activeTool) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Input Text</label>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={
                      activeTool === 'csv-json'
                        ? 'Paste CSV text or raw JSON array here...'
                        : 'Paste Markdown document or HTML tags here...'
                    }
                    className="w-full h-80 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-xs text-[var(--text-primary)] focus:ring-[var(--accent)] focus:border-[var(--accent)] font-mono resize-none focus:outline-none"
                  />
                  <Button
                    onClick={activeTool === 'csv-json' ? handleCsvJson : handleMdHtml}
                    className="w-full py-2.5 font-bold"
                  >
                    Convert Code
                  </Button>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Output Result</label>
                    {textOutput && (
                      <button
                        onClick={handleCopyText}
                        className="flex items-center gap-1 text-xs text-[var(--accent)] font-semibold hover:underline"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <textarea
                    readOnly
                    value={textOutput}
                    placeholder="Output results will render here..."
                    className="w-full h-80 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)] font-mono resize-none focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              // Context B: File-based converters (PDF/DOCX/XLSX/Images)
              <div className="space-y-5">
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                  className="border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)]/30 rounded-2xl p-10 text-center cursor-pointer transition-all space-y-4"
                >
                  <Upload className="w-10 h-10 text-[var(--text-tertiary)] mx-auto animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Drag & drop files here, or click to browse</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {activeTool === 'pdf-to-img' && 'Supports .pdf files'}
                      {activeTool === 'img-to-pdf' && 'Supports .jpg, .jpeg, .png files'}
                      {activeTool === 'pdf-to-text' && 'Supports .pdf files'}
                      {activeTool === 'docx-pdf' && 'Supports .docx files'}
                      {activeTool === 'pdf-docx' && 'Supports .pdf files'}
                      {activeTool === 'xlsx-pdf' && 'Supports .xlsx files'}
                      {activeTool === 'pdf-xlsx' && 'Supports .pdf files'}
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple={activeTool === 'img-to-pdf'}
                    onChange={handleFileChange}
                    accept={
                      activeTool === 'img-to-pdf'
                        ? 'image/png, image/jpeg, image/jpg'
                        : activeTool === 'docx-pdf'
                        ? '.docx'
                        : activeTool === 'xlsx-pdf'
                        ? '.xlsx'
                        : '.pdf'
                    }
                    className="hidden"
                  />
                </div>

                {/* Selected files listing */}
                {files.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs space-y-2">
                    <p className="font-semibold text-[var(--text-primary)]">Selected Files ({files.length})</p>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {files.map((f, idx) => (
                        <div key={idx} className="flex justify-between text-[var(--text-secondary)]">
                          <span className="truncate pr-4">{f.name}</span>
                          <span>{formatBytes(f.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Processing State */}
                {isProcessing && (
                  <div className="flex items-center gap-2 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-xs font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{progressText}</span>
                  </div>
                )}

                {/* Convert Actions */}
                <div className="flex gap-3">
                  {activeTool === 'pdf-to-img' && (
                    <>
                      <Button className="flex-1 py-2.5 font-bold" onClick={() => handlePdfToImg('png')} loading={isProcessing}>
                        Export as PNG ZIP
                      </Button>
                      <Button className="flex-1 py-2.5 font-bold" onClick={() => handlePdfToImg('jpeg')} loading={isProcessing}>
                        Export as JPEG ZIP
                      </Button>
                    </>
                  )}
                  {activeTool === 'img-to-pdf' && (
                    <Button className="w-full py-2.5 font-bold animate-shimmer" onClick={handleImgToPdf} loading={isProcessing}>
                      Convert Images to PDF
                    </Button>
                  )}
                  {activeTool === 'pdf-to-text' && (
                    <Button className="w-full py-2.5 font-bold" onClick={handlePdfToText} loading={isProcessing}>
                      Extract Text Content
                    </Button>
                  )}
                  {activeTool === 'docx-pdf' && (
                    <Button className="w-full py-2.5 font-bold" onClick={handleDocxToPdf} loading={isProcessing}>
                      Convert DOCX to PDF
                    </Button>
                  )}
                  {activeTool === 'pdf-docx' && (
                    <Button className="w-full py-2.5 font-bold" onClick={handlePdfToDocx} loading={isProcessing}>
                      Convert PDF to DOCX
                    </Button>
                  )}
                  {activeTool === 'xlsx-pdf' && (
                    <Button className="w-full py-2.5 font-bold" onClick={handleXlsxToPdf} loading={isProcessing}>
                      Convert Spreadsheet to PDF
                    </Button>
                  )}
                  {activeTool === 'pdf-xlsx' && (
                    <Button className="w-full py-2.5 font-bold" onClick={handlePdfToXlsx} loading={isProcessing}>
                      Convert PDF to Excel (CSV)
                    </Button>
                  )}
                </div>

                {/* Plain text output area (for PDF-to-Text tool) */}
                {activeTool === 'pdf-to-text' && textOutput && (
                  <div className="space-y-2.5 border-t border-[var(--border-color)] pt-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Extracted Text</label>
                      <button
                        onClick={handleCopyText}
                        className="flex items-center gap-1 text-xs text-[var(--accent)] font-semibold hover:underline"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? 'Copied!' : 'Copy Text'}
                      </button>
                    </div>
                    <textarea
                      readOnly
                      value={textOutput}
                      className="w-full h-64 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)] font-mono resize-none focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
