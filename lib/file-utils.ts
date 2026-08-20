import { v4 as uuidv4 } from "uuid";

export interface FileMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  createdAt: string;
  expiresAt: string;
}

const FILE_TTL_MS = 60 * 60 * 1000;

function generateFileId(): string {
  return uuidv4();
}

function getExpiryDate(): Date {
  return new Date(Date.now() + FILE_TTL_MS);
}

export function createFileMeta(name: string, size: number, type: string): FileMeta {
  return {
    id: generateFileId(),
    name,
    size,
    type,
    createdAt: new Date().toISOString(),
    expiresAt: getExpiryDate().toISOString(),
  };
}

export function isValidFileType(file: File, accepts: string[]): boolean {
  const mimeMap: Record<string, string[]> = {
    pdf: ["application/pdf"],
    image: ["image/jpeg", "image/png"],
    word: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    excel: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  };

  const extMap: Record<string, string[]> = {
    pdf: [".pdf"],
    image: [".jpg", ".jpeg", ".png"],
    word: [".doc", ".docx"],
    excel: [".xls", ".xlsx"],
  };

  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";

  for (const accept of accepts) {
    const mimes = mimeMap[accept];
    if (mimes && file.type && mimes.includes(file.type)) return true;

    if (accept.startsWith("image/") || accept.startsWith("application/")) {
      if (file.type && file.type === accept) return true;
      const category = Object.keys(mimeMap).find((k) => mimeMap[k].includes(accept));
      if (category && extMap[category]?.includes(ext)) return true;
    }

    const extensions = extMap[accept];
    if (extensions && extensions.includes(ext)) return true;
  }
  return false;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const MAX_FILE_SIZE = 100 * 1024 * 1024;

const INVALID_FS_CHARS = /[\\/:*?"<>|\x00-\x1f]/g;

export function parseFileName(fullName: string): { base: string; ext: string } {
  const lastDot = fullName.lastIndexOf(".");
  if (lastDot <= 0) return { base: fullName, ext: "" };
  return { base: fullName.slice(0, lastDot), ext: fullName.slice(lastDot) };
}

export function sanitizeFileName(name: string): string {
  return name.replace(INVALID_FS_CHARS, "").replace(/\s+/g, " ").trim();
}

export function ensureExtension(name: string, requiredExt: string): string {
  if (!requiredExt) return name;
  const { base, ext } = parseFileName(name);
  const lowerExt = ext.toLowerCase();
  const lowerReq = requiredExt.toLowerCase();
  if (lowerExt === lowerReq) return name;
  if (lowerReq.endsWith(lowerExt) && lowerExt.length > 0) return name;
  return base + requiredExt;
}

export function getFileMimeType(file: File): string {
  if (file.type) return file.type;
  const { ext } = parseFileName(file.name);
  const mimeMap: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".txt": "text/plain",
  };
  return mimeMap[ext.toLowerCase()] || "application/octet-stream";
}

export function isPdfFile(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function canPreviewInBrowser(mimeType: string): boolean {
  return isPdfFile(mimeType) || isImageFile(mimeType);
}
