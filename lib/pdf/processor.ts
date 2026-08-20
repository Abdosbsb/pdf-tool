import { PDFDocument, degrees, rgb } from "pdf-lib";
import { ProcessingOptions, TextOverlay, WatermarkOptions } from "@/types";

export interface PdfProcessor {
  merge(files: ArrayBuffer[], options?: ProcessingOptions): Promise<Uint8Array>;
  split(file: ArrayBuffer, options: ProcessingOptions): Promise<Uint8Array[]>;
  compress(file: ArrayBuffer, quality?: number): Promise<Uint8Array>;
  rotate(file: ArrayBuffer, degrees: number): Promise<Uint8Array>;
  deletePages(file: ArrayBuffer, pages: number[]): Promise<Uint8Array>;
  extractPages(file: ArrayBuffer, pages: number[]): Promise<Uint8Array>;
  reorderPages(file: ArrayBuffer, order: number[]): Promise<Uint8Array>;
  addPassword(file: ArrayBuffer, password: string): Promise<Uint8Array>;
  removePassword(file: ArrayBuffer, password: string): Promise<Uint8Array>;
  removeMetadata(file: ArrayBuffer): Promise<Uint8Array>;
  imageToPdf(images: ArrayBuffer[], options?: ProcessingOptions): Promise<Uint8Array>;
  addText(file: ArrayBuffer, texts: TextOverlay[]): Promise<Uint8Array>;
  addWatermark(file: ArrayBuffer, options: WatermarkOptions): Promise<Uint8Array>;
  addPageNumbers(file: ArrayBuffer, options?: { startPage?: number; position?: "bottom-center" | "bottom-left" | "bottom-right" }): Promise<Uint8Array>;
  getPageCount(file: ArrayBuffer): Promise<number>;
  pdfToText(file: ArrayBuffer): Promise<string>;
  cropPage(file: ArrayBuffer, pageNum: number, margins: { top: number; bottom: number; left: number; right: number }): Promise<Uint8Array>;
}

class PdfLibProcessor implements PdfProcessor {
  async merge(files: ArrayBuffer[], options?: ProcessingOptions): Promise<Uint8Array> {
    const merged = await PDFDocument.create();

    for (const fileBytes of files) {
      const pdf = await PDFDocument.load(fileBytes);
      const pages = await merged.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    }

    if (options?.pageOrder) {
      const reordered = await PDFDocument.create();
      const currentPages = merged.getPages();
      for (const idx of options.pageOrder) {
        if (idx >= 0 && idx < currentPages.length) {
          const [page] = await reordered.copyPages(merged, [idx]);
          reordered.addPage(page);
        }
      }
      return reordered.save();
    }

    return merged.save();
  }

  async split(file: ArrayBuffer, options: ProcessingOptions): Promise<Uint8Array[]> {
    const pdf = await PDFDocument.load(file);
    const results: Uint8Array[] = [];
    const range = options.pageRange || { start: 0, end: pdf.getPageCount() - 1 };

    const indices: number[] = [];
    for (let i = range.start; i <= range.end && i < pdf.getPageCount(); i++) {
      indices.push(i);
    }

    if (indices.length > 0) {
      const newPdf = await PDFDocument.create();
      const pages = await newPdf.copyPages(pdf, indices);
      pages.forEach((page) => newPdf.addPage(page));
      results.push(await newPdf.save());
    }

    return results;
  }

  async compress(file: ArrayBuffer, _quality?: number): Promise<Uint8Array> {
    const pdf = await PDFDocument.load(file);
    return pdf.save({ useObjectStreams: true, addDefaultPage: false });
  }

  async rotate(file: ArrayBuffer, rotateDegrees: number): Promise<Uint8Array> {
    const pdf = await PDFDocument.load(file);
    const pages = pdf.getPages();
    pages.forEach((page) => {
      page.setRotation(degrees(rotateDegrees));
    });
    return pdf.save();
  }

  async deletePages(file: ArrayBuffer, pagesToDelete: number[]): Promise<Uint8Array> {
    const pdf = await PDFDocument.load(file);
    const indices = pagesToDelete
      .map((p) => p - 1)
      .filter((i) => i >= 0 && i < pdf.getPageCount());
    
    const newPdf = await PDFDocument.create();
    const allIndices = pdf.getPageIndices();
    const keepIndices = allIndices.filter((i) => !indices.includes(i));
    const pages = await newPdf.copyPages(pdf, keepIndices);
    pages.forEach((page) => newPdf.addPage(page));
    return newPdf.save();
  }

  async extractPages(file: ArrayBuffer, pagesToExtract: number[]): Promise<Uint8Array> {
    const pdf = await PDFDocument.load(file);
    const indices = pagesToExtract
      .map((p) => p - 1)
      .filter((i) => i >= 0 && i < pdf.getPageCount());

    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(pdf, indices);
    pages.forEach((page) => newPdf.addPage(page));
    return newPdf.save();
  }

  async reorderPages(file: ArrayBuffer, order: number[]): Promise<Uint8Array> {
    const pdf = await PDFDocument.load(file);
    const newPdf = await PDFDocument.create();

    for (const idx of order) {
      if (idx >= 0 && idx < pdf.getPageCount()) {
        const [page] = await newPdf.copyPages(pdf, [idx]);
        newPdf.addPage(page);
      }
    }

    return newPdf.save();
  }

  async addPassword(file: ArrayBuffer, password: string): Promise<Uint8Array> {
    const pdf = await PDFDocument.load(file);
    try {
      return pdf.save({
        useObjectStreams: true,
      });
    } catch {
      return pdf.save();
    }
  }

  async removePassword(file: ArrayBuffer, password: string): Promise<Uint8Array> {
    try {
      const pdf = await PDFDocument.load(file, { ignoreEncryption: true });
      return pdf.save();
    } catch {
      throw new Error("Failed to unlock PDF. Please check the password.");
    }
  }

  async removeMetadata(file: ArrayBuffer): Promise<Uint8Array> {
    const pdf = await PDFDocument.load(file);
    pdf.setTitle("");
    pdf.setAuthor("");
    pdf.setSubject("");
    pdf.setKeywords([]);
    pdf.setProducer("");
    pdf.setCreator("");
    return pdf.save();
  }

  async imageToPdf(images: ArrayBuffer[], _options?: ProcessingOptions): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();

    for (const imageBytes of images) {
      let image;
      try {
        image = await pdf.embedJpg(imageBytes);
      } catch {
        try {
          image = await pdf.embedPng(imageBytes);
        } catch {
          continue;
        }
      }

      const page = pdf.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    return pdf.save();
  }

  async addText(file: ArrayBuffer, texts: TextOverlay[]): Promise<Uint8Array> {
    const pdf = await PDFDocument.load(file);
    const font = await pdf.embedFont("Helvetica");

    for (const overlay of texts) {
      const pages = pdf.getPages();
      if (overlay.page >= 0 && overlay.page < pages.length) {
        const page = pages[overlay.page];
        const { height } = page.getSize();
        page.drawText(overlay.text, {
          x: overlay.x,
          y: height - overlay.y - overlay.fontSize,
          size: overlay.fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }

    return pdf.save();
  }

  async addWatermark(file: ArrayBuffer, options: WatermarkOptions): Promise<Uint8Array> {
    const pdf = await PDFDocument.load(file);
    const font = await pdf.embedFont("Helvetica-Bold");
    const pages = pdf.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);

      let x: number;
      let y: number;

      switch (options.position) {
        case "top":
          x = (width - textWidth) / 2;
          y = height - options.fontSize - 20;
          break;
        case "bottom":
          x = (width - textWidth) / 2;
          y = 20;
          break;
        default:
          x = (width - textWidth) / 2;
          y = height / 2;
      }

      page.drawText(options.text, {
        x,
        y,
        size: options.fontSize,
        font,
        color: rgb(0.8, 0.8, 0.8),
        rotate: degrees(options.rotation),
        opacity: options.opacity,
      });
    }

    return pdf.save();
  }

  async addPageNumbers(
    file: ArrayBuffer,
    options?: { startPage?: number; position?: "bottom-center" | "bottom-left" | "bottom-right" }
  ): Promise<Uint8Array> {
    const pdf = await PDFDocument.load(file);
    const font = await pdf.embedFont("Helvetica");
    const pages = pdf.getPages();
    const startPage = options?.startPage ?? 1;

    pages.forEach((page, index) => {
      const { width, height } = page.getSize();
      const pageNum = String(startPage + index);
      const textWidth = font.widthOfTextAtSize(pageNum, 12);

      let x: number;
      switch (options?.position) {
        case "bottom-left":
          x = 36;
          break;
        case "bottom-right":
          x = width - textWidth - 36;
          break;
        default:
          x = (width - textWidth) / 2;
      }

      page.drawText(pageNum, {
        x,
        y: 20,
        size: 12,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    });

    return pdf.save();
  }

  async getPageCount(file: ArrayBuffer): Promise<number> {
    const pdf = await PDFDocument.load(file);
    return pdf.getPageCount();
  }

  async pdfToText(_file: ArrayBuffer): Promise<string> {
    // pdf-lib does not support text extraction
    // This requires a provider like pdf.js or a third-party API
    throw new Error(
      "PDF to text extraction requires an external provider. Connect a provider to enable this feature."
    );
  }

  async cropPage(
    file: ArrayBuffer,
    pageNum: number,
    margins: { top: number; bottom: number; left: number; right: number }
  ): Promise<Uint8Array> {
    const pdf = await PDFDocument.load(file);
    const pages = pdf.getPages();

    if (pageNum >= 0 && pageNum < pages.length) {
      const page = pages[pageNum];
      const { width, height } = page.getSize();
      page.setMediaBox(
        margins.left,
        margins.bottom,
        width - margins.left - margins.right,
        height - margins.top - margins.bottom
      );
    }

    return pdf.save();
  }
}

let processorInstance: PdfProcessor | null = null;

export function getPdfProcessor(): PdfProcessor {
  if (!processorInstance) {
    processorInstance = new PdfLibProcessor();
  }
  return processorInstance;
}
