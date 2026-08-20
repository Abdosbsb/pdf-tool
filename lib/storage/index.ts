export interface StorageProvider {
  upload(id: string, data: Buffer, contentType: string): Promise<string>;
  download(id: string): Promise<Buffer>;
  delete(id: string): Promise<void>;
  getSignedUrl(id: string, expiresIn?: number): Promise<string>;
  exists(id: string): Promise<boolean>;
}

class LocalStorageProvider implements StorageProvider {
  private store = new Map<string, { data: Buffer; contentType: string }>();

  async upload(id: string, data: Buffer, contentType: string): Promise<string> {
    this.store.set(id, { data, contentType });
    return `/api/files/${id}`;
  }

  async download(id: string): Promise<Buffer> {
    const entry = this.store.get(id);
    if (!entry) throw new Error("File not found");
    return entry.data;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async getSignedUrl(id: string, expiresIn?: number): Promise<string> {
    if (!this.store.has(id)) throw new Error("File not found");
    return `/api/files/${id}?expires=${Date.now() + (expiresIn || 3600000)}`;
  }

  async exists(id: string): Promise<boolean> {
    return this.store.has(id);
  }
}

let storageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!storageInstance) {
    if (process.env.STORAGE_ENDPOINT) {
      storageInstance = createS3Provider();
    } else {
      storageInstance = new LocalStorageProvider();
    }
  }
  return storageInstance;
}

function createS3Provider(): StorageProvider {
  return new LocalStorageProvider();
}

export async function cleanupExpiredFiles(): Promise<void> {
  // In production, iterate storage and delete files past their expiry
  // For Vercel, this can be triggered via cron endpoint
}
