export type ToolId =
  | "merge-pdf"
  | "split-pdf"
  | "rotate-pdf"
  | "reorder-pages"
  | "delete-pages"
  | "extract-pages"
  | "compress-pdf"
  | "jpg-to-pdf"
  | "pdf-to-jpg"
  | "pdf-to-png"
  | "pdf-to-text"
  | "pdf-to-word"
  | "word-to-pdf"
  | "pdf-to-excel"
  | "excel-to-pdf"
  | "edit-pdf"
  | "watermark"
  | "page-numbers"
  | "crop-pdf"
  | "annotate-pdf"
  | "protect-pdf"
  | "unlock-pdf"
  | "remove-metadata";

export type ToolCategory = "organize" | "optimize" | "convert" | "edit" | "security";

export interface ToolMeta {
  id: ToolId;
  category: ToolCategory;
  nameKey: string;
  descriptionKey: string;
  href: string;
  icon: string;
  multipleFiles?: boolean;
  requiresProvider?: boolean;
  acceptsInput?: ("pdf" | "image" | "word" | "excel")[];
  outputType?: string;
}

export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED";

export interface Job {
  id: string;
  userId?: string;
  tool: ToolId;
  status: JobStatus;
  inputFiles: string[];
  outputFile?: string;
  inputSize: number;
  outputSize?: number;
  options?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  expiresAt: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  expiresAt: string;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface ProcessingOptions {
  password?: string;
  pageRange?: { start: number; end: number };
  pageOrder?: number[];
  quality?: number;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkPosition?: "center" | "top" | "bottom";
  fontSize?: number;
  fontColor?: string;
}

export interface StorageProvider {
  upload(id: string, data: Buffer, contentType: string): Promise<string>;
  download(id: string): Promise<Buffer>;
  delete(id: string): Promise<void>;
  getSignedUrl(id: string, expiresIn?: number): Promise<string>;
  exists(id: string): Promise<boolean>;
}

export interface PdfProcessingProvider {
  merge(files: Buffer[], options?: ProcessingOptions): Promise<Buffer>;
  split(file: Buffer, options: ProcessingOptions): Promise<Buffer[]>;
  compress(file: Buffer, quality?: number): Promise<Buffer>;
  rotate(file: Buffer, degrees: number): Promise<Buffer>;
  addPassword(file: Buffer, password: string): Promise<Buffer>;
  removePassword(file: Buffer, password: string): Promise<Buffer>;
  removeMetadata(file: Buffer): Promise<Buffer>;
  imageToPdf(images: Buffer[], options?: ProcessingOptions): Promise<Buffer>;
  pdfToImages(file: Buffer, format: "jpg" | "png", quality?: number): Promise<Buffer[]>;
  pdfToText(file: Buffer): Promise<string>;
  addText(file: Buffer, texts: TextOverlay[], options?: ProcessingOptions): Promise<Buffer>;
  addWatermark(file: Buffer, options: WatermarkOptions): Promise<Buffer>;
  addPageNumbers(file: Buffer, options?: ProcessingOptions): Promise<Buffer>;
}

export interface TextOverlay {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  page: number;
}

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  position: "center" | "top" | "bottom";
}

export interface LocaleMessages {
  [key: string]: string | LocaleMessages;
}
