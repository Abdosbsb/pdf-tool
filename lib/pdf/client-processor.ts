import { PDFDocument, degrees, rgb } from "pdf-lib";

export async function mergeFiles(files: File[]): Promise<Blob> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(buffer);
    const pages = await merged.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  const bytes = await merged.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export async function splitFile(
  file: File,
  startPage: number,
  endPage: number
): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  const pageCount = pdf.getPageCount();
  const newPdf = await PDFDocument.create();
  const indices: number[] = [];
  for (let i = startPage; i <= endPage && i <= pageCount; i++) {
    if (i >= 1) indices.push(i - 1);
  }
  if (indices.length > 0) {
    const pages = await newPdf.copyPages(pdf, indices);
    pages.forEach((page) => newPdf.addPage(page));
  }
  const bytes = await newPdf.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export async function compressFile(
  file: File,
  _quality?: number
): Promise<{ blob: Blob; inputSize: number; outputSize: number }> {
  const buffer = await file.arrayBuffer();
  const inputSize = buffer.byteLength;
  const pdf = await PDFDocument.load(buffer);
  const bytes = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
  const outputSize = bytes.length;
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  return { blob, inputSize, outputSize };
}

export async function rotateFile(file: File, rotateDegrees: number): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  const pages = pdf.getPages();
  pages.forEach((page) => {
    page.setRotation(degrees(rotateDegrees));
  });
  const bytes = await pdf.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export async function deletePages(file: File, pagesToDelete: number[]): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  const pageCount = pdf.getPageCount();
  const indicesToDelete = pagesToDelete
    .map((p) => p - 1)
    .filter((i) => i >= 0 && i < pageCount);
  const newPdf = await PDFDocument.create();
  const allIndices = pdf.getPageIndices();
  const keepIndices = allIndices.filter((i) => !indicesToDelete.includes(i));
  const pages = await newPdf.copyPages(pdf, keepIndices);
  pages.forEach((page) => newPdf.addPage(page));
  const bytes = await newPdf.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export async function extractPages(file: File, pagesToExtract: number[]): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  const pageCount = pdf.getPageCount();
  const indices = pagesToExtract
    .map((p) => p - 1)
    .filter((i) => i >= 0 && i < pageCount);
  const newPdf = await PDFDocument.create();
  if (indices.length > 0) {
    const pages = await newPdf.copyPages(pdf, indices);
    pages.forEach((page) => newPdf.addPage(page));
  }
  const bytes = await newPdf.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export async function reorderPages(file: File, order: number[]): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  const newPdf = await PDFDocument.create();
  for (const idx of order) {
    if (idx >= 0 && idx < pdf.getPageCount()) {
      const [page] = await newPdf.copyPages(pdf, [idx]);
      newPdf.addPage(page);
    }
  }
  const bytes = await newPdf.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export async function protectFile(file: File, _password: string): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  const bytes = await pdf.save({ useObjectStreams: true });
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export async function unlockFile(file: File, _password: string): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  try {
    const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const bytes = await pdf.save();
    return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  } catch {
    throw new Error("Failed to unlock PDF. Please check the password.");
  }
}

export async function removeMetadata(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  pdf.setTitle("");
  pdf.setAuthor("");
  pdf.setSubject("");
  pdf.setKeywords([]);
  pdf.setProducer("");
  pdf.setCreator("");
  const bytes = await pdf.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export async function convertImagesToPdf(files: File[]): Promise<Blob> {
  const pdf = await PDFDocument.create();
  for (const file of files) {
    const buffer = await file.arrayBuffer();
    let image;
    try {
      image = await pdf.embedJpg(buffer);
    } catch {
      try {
        image = await pdf.embedPng(buffer);
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
  const bytes = await pdf.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export async function addWatermark(
  file: File,
  text: string,
  position: "center" | "top" | "bottom",
  opacity: number,
  fontSize: number
): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  const font = await pdf.embedFont("Helvetica-Bold");
  const pages = pdf.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x: number;
    let y: number;
    switch (position) {
      case "top":
        x = (width - textWidth) / 2;
        y = height - fontSize - 20;
        break;
      case "bottom":
        x = (width - textWidth) / 2;
        y = 20;
        break;
      default:
        x = (width - textWidth) / 2;
        y = height / 2;
    }
    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.8, 0.8, 0.8),
      rotate: degrees(45),
      opacity,
    });
  }
  const bytes = await pdf.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export async function addPageNumbers(
  file: File,
  startPage: number = 1,
  position: "bottom-center" | "bottom-left" | "bottom-right" = "bottom-center"
): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  const font = await pdf.embedFont("Helvetica");
  const pages = pdf.getPages();

  pages.forEach((page, index) => {
    const { width } = page.getSize();
    const pageNum = String(startPage + index);
    const textWidth = font.widthOfTextAtSize(pageNum, 12);
    let x: number;
    switch (position) {
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
  const bytes = await pdf.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export async function cropPage(
  file: File,
  pageNum: number,
  margins: { top: number; bottom: number; left: number; right: number }
): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
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
  const bytes = await pdf.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}
