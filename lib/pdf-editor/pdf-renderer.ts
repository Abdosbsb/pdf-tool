import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export interface PdfPageInfo {
  pageNumber: number;
  width: number;
  height: number;
}

export interface PdfLoadResult {
  pdfDocument: PDFDocumentProxy;
  totalPages: number;
  pages: PdfPageInfo[];
}

export async function loadPdf(source: string | ArrayBuffer): Promise<PdfLoadResult> {
  let data: Uint8Array;

  if (typeof source === "string") {
    const res = await fetch(source);
    if (!res.ok) throw new Error("Failed to load PDF");
    const buf = await res.arrayBuffer();
    data = new Uint8Array(buf);
  } else {
    data = new Uint8Array(source);
  }

  const pdfDocument = await pdfjsLib.getDocument({ data }).promise;
  const totalPages = pdfDocument.numPages;
  const pages: PdfPageInfo[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDocument.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    pages.push({
      pageNumber: i,
      width: viewport.width,
      height: viewport.height,
    });
  }

  return { pdfDocument, totalPages, pages };
}

export async function renderPageToCanvas(
  pdfDocument: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number
): Promise<void> {
  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
}

export async function renderThumbnail(
  pdfDocument: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  maxHeight: number
): Promise<void> {
  const page = await pdfDocument.getPage(pageNumber);
  const unscaledViewport = page.getViewport({ scale: 1 });
  const scale = maxHeight / unscaledViewport.height;

  const viewport = page.getViewport({ scale });
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
}
