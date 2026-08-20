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
    image: ["image/jpeg", "image/png", "image/jpg"],
    word: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    excel: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  };

  for (const accept of accepts) {
    const mimes = mimeMap[accept];
    if (mimes && mimes.includes(file.type)) return true;
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
