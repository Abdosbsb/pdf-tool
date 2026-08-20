export interface AdvancedConversionProvider {
  pdfToWord(input: Buffer, fileName?: string): Promise<Buffer>;
  wordToPdf(input: Buffer, fileName?: string): Promise<Buffer>;
  pdfToExcel(input: Buffer, fileName?: string): Promise<Buffer>;
  excelToPdf(input: Buffer, fileName?: string): Promise<Buffer>;
  pdfToText(input: Buffer, fileName?: string): Promise<string>;
  pdfToJpg(input: Buffer, fileName?: string): Promise<Buffer>;
  pdfToPng(input: Buffer, fileName?: string): Promise<Buffer>;

  startConversion(
    input: Buffer,
    inputFormat: string,
    outputFormat: string,
    inputFileName: string
  ): Promise<{ jobId: string }>;

  pollConversion(
    jobId: string
  ): Promise<{
    status: "processing" | "finished" | "error";
    files?: Array<{ url: string; filename: string; size: number }>;
    error?: string;
  }>;

  downloadResultFile(url: string): Promise<Buffer>;
}

class StubProvider implements AdvancedConversionProvider {
  private throwMissing() {
    throw new Error(
      "This conversion requires an external provider. Set PDF_PROVIDER_API_KEY to enable this feature."
    );
  }

  async pdfToWord(): Promise<Buffer> { this.throwMissing(); return Buffer.alloc(0); }
  async wordToPdf(): Promise<Buffer> { this.throwMissing(); return Buffer.alloc(0); }
  async pdfToExcel(): Promise<Buffer> { this.throwMissing(); return Buffer.alloc(0); }
  async excelToPdf(): Promise<Buffer> { this.throwMissing(); return Buffer.alloc(0); }
  async pdfToText(): Promise<string> { this.throwMissing(); return ""; }
  async pdfToJpg(): Promise<Buffer> { this.throwMissing(); return Buffer.alloc(0); }
  async pdfToPng(): Promise<Buffer> { this.throwMissing(); return Buffer.alloc(0); }

  async startConversion(): Promise<{ jobId: string }> {
    this.throwMissing();
    return { jobId: "" };
  }

  async pollConversion(): Promise<{
    status: "processing" | "finished" | "error";
    files?: Array<{ url: string; filename: string; size: number }>;
    error?: string;
  }> {
    this.throwMissing();
    return { status: "error", error: "Not configured" };
  }

  async downloadResultFile(): Promise<Buffer> {
    this.throwMissing();
    return Buffer.alloc(0);
  }
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  const table = crc32.table;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

crc32.table = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

const CC_API_BASE = "https://api.cloudconvert.com/v2";

interface CCTask {
  id: string;
  operation: string;
  status: string;
  message?: string;
  code?: string;
  result?: {
    form?: {
      url: string;
      parameters: Record<string, string | number>;
    };
    files?: Array<{
      url: string;
      filename: string;
      size: number;
    }>;
  };
}

interface CCJobResponse {
  data: {
    id: string;
    status: string;
    tasks: CCTask[];
  };
}

function getApiKey(): string {
  const key = process.env.PDF_PROVIDER_API_KEY;
  if (!key) {
    throw new Error("PDF_PROVIDER_API_KEY is not configured");
  }
  return key;
}

async function ccFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const apiKey = getApiKey();
  const res = await fetch(`${CC_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res;
}

async function createCCJob(
  tasks: Record<string, unknown>
): Promise<CCJobResponse> {
  const res = await ccFetch("/jobs", {
    method: "POST",
    body: JSON.stringify({ tasks }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    console.error(
      `[cloudconvert] Job creation failed (HTTP ${res.status}):`,
      JSON.stringify(body)
    );
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "Invalid or unauthorized API key. Please check your PDF_PROVIDER_API_KEY configuration."
      );
    }
    if (res.status === 400) {
      const msg =
        body?.message || body?.error?.message || "Invalid conversion request";
      throw new Error(`CloudConvert rejected the request: ${msg}`);
    }
    throw new Error(
      body?.message || `CloudConvert job creation failed (HTTP ${res.status})`
    );
  }

  return res.json();
}

async function uploadFileToCC(
  formUrl: string,
  parameters: Record<string, string | number>,
  buffer: Buffer,
  fileName: string
): Promise<void> {
  const formData = new FormData();

  const keys = Object.keys(parameters);
  for (const key of keys) {
    formData.append(key, String(parameters[key]));
  }

  const ext = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "";
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
  };
  const mimeType = mimeMap[ext || ""] || "application/octet-stream";

  formData.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: mimeType }),
    fileName
  );

  const res = await fetch(formUrl, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `File upload to CloudConvert failed (HTTP ${res.status}): ${text.slice(0, 200)}`
    );
  }
}

async function checkJobStatus(jobId: string): Promise<CCJobResponse> {
  const res = await ccFetch(`/jobs/${jobId}?include=tasks`);

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.message || `Failed to check job status (HTTP ${res.status})`
    );
  }

  return res.json();
}

async function downloadFile(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to download converted file from CloudConvert (HTTP ${res.status})`
    );
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

class CloudConvertProvider implements AdvancedConversionProvider {
  async startConversion(
    input: Buffer,
    inputFormat: string,
    outputFormat: string,
    inputFileName: string
  ): Promise<{ jobId: string }> {
    console.log(
      `[cloudconvert] Starting conversion: ${inputFormat} → ${outputFormat}, file: ${inputFileName}, size: ${input.length} bytes`
    );

    const job = await createCCJob({
      "import-file": {
        operation: "import/upload",
      },
      "convert-file": {
        operation: "convert",
        input: "import-file",
        input_format: inputFormat,
        output_format: outputFormat,
      },
      "export-file": {
        operation: "export/url",
        input: "convert-file",
      },
    });

    console.log(
      `[cloudconvert] Job created: ${job.data.id}, status: ${job.data.status}, tasks: ${job.data.tasks?.map((t) => `${t.operation}(${t.status})`).join(", ")}`
    );

    const importTask = job.data.tasks.find(
      (t) => t.operation === "import/upload"
    );
    if (!importTask?.result?.form) {
      console.error(
        `[cloudconvert] No import task or upload URL found. Tasks:`,
        JSON.stringify(job.data.tasks?.map((t) => ({ operation: t.operation, status: t.status, id: t.id })))
      );
      throw new Error("CloudConvert did not provide an upload URL");
    }

    console.log(`[cloudconvert] Uploading file to CloudConvert...`);
    await uploadFileToCC(
      importTask.result.form.url,
      importTask.result.form.parameters,
      input,
      inputFileName
    );
    console.log(`[cloudconvert] Upload complete for job ${job.data.id}`);

    return { jobId: job.data.id };
  }

  async pollConversion(
    jobId: string
  ): Promise<{
    status: "processing" | "finished" | "error";
    files?: Array<{ url: string; filename: string; size: number }>;
    error?: string;
  }> {
    const job = await checkJobStatus(jobId);

    if (job.data.tasks) {
      for (const task of job.data.tasks) {
        console.log(
          `[cloudconvert] Job ${jobId} Task "${task.operation}" (id=${task.id}): status=${task.status}` +
            (task.message ? ` message="${task.message}"` : "") +
            (task.code ? ` code="${task.code}"` : "")
        );
        if (task.status === "completed" && task.result?.files) {
          for (const f of task.result.files) {
            console.log(
              `[cloudconvert]   -> output: ${f.filename} (${f.size} bytes)`
            );
          }
        }
      }
    }

    if (job.data.status === "finished") {
      console.log(`[cloudconvert] Job ${jobId} finished`);
      const exportTask = job.data.tasks.find(
        (t) => t.operation === "export/url"
      );
      const files = exportTask?.result?.files;
      if (!files || files.length === 0) {
        return { status: "error", error: "CloudConvert produced no output files" };
      }
      return {
        status: "finished",
        files: files.map((f) => ({ url: f.url, filename: f.filename, size: f.size })),
      };
    }

    if (job.data.status === "error") {
      const failedTask = job.data.tasks?.find((t) => t.status === "error");
      const taskMsg = failedTask?.message || failedTask?.code;
      console.error(
        `[cloudconvert] Job ${jobId} FAILED: ${taskMsg || "unknown error"}`
      );
      return { status: "error", error: taskMsg || "CloudConvert conversion failed" };
    }

    return { status: "processing" };
  }

  async downloadResultFile(url: string): Promise<Buffer> {
    return downloadFile(url);
  }

  async pdfToWord(input: Buffer, fileName?: string): Promise<Buffer> {
    return this.runFullConversion(input, "pdf", "docx", fileName || "input.pdf");
  }

  async wordToPdf(input: Buffer, fileName?: string): Promise<Buffer> {
    const ext = this.detectOfficeExtension(fileName, "docx");
    return this.runFullConversion(input, ext, "pdf", fileName || `input.${ext}`);
  }

  async pdfToExcel(input: Buffer, fileName?: string): Promise<Buffer> {
    return this.runFullConversion(input, "pdf", "xlsx", fileName || "input.pdf");
  }

  async excelToPdf(input: Buffer, fileName?: string): Promise<Buffer> {
    const ext = this.detectOfficeExtension(fileName, "xlsx");
    return this.runFullConversion(input, ext, "pdf", fileName || `input.${ext}`);
  }

  async pdfToText(input: Buffer, fileName?: string): Promise<string> {
    const buffer = await this.runFullConversion(
      input,
      "pdf",
      "txt",
      fileName || "input.pdf"
    );
    return buffer.toString("utf-8");
  }

  async pdfToJpg(input: Buffer, fileName?: string): Promise<Buffer> {
    const results = await this.runFullConversionMultiple(
      input,
      "pdf",
      "jpg",
      fileName || "input.pdf"
    );
    if (results.length === 1) {
      return results[0].buffer;
    }
    return this.packAsZip(results);
  }

  async pdfToPng(input: Buffer, fileName?: string): Promise<Buffer> {
    const results = await this.runFullConversionMultiple(
      input,
      "pdf",
      "png",
      fileName || "input.pdf"
    );
    if (results.length === 1) {
      return results[0].buffer;
    }
    return this.packAsZip(results);
  }

  private async runFullConversion(
    input: Buffer,
    inputFormat: string,
    outputFormat: string,
    inputFileName: string
  ): Promise<Buffer> {
    const { jobId } = await this.startConversion(input, inputFormat, outputFormat, inputFileName);

    const maxPolls = 120;
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const result = await this.pollConversion(jobId);
      if (result.status === "finished") {
        if (!result.files || result.files.length === 0) {
          throw new Error("CloudConvert produced no output files");
        }
        return downloadFile(result.files[0].url);
      }
      if (result.status === "error") {
        throw new Error(result.error || "CloudConvert conversion failed");
      }
    }
    throw new Error("CloudConvert conversion timed out");
  }

  private async runFullConversionMultiple(
    input: Buffer,
    inputFormat: string,
    outputFormat: string,
    inputFileName: string
  ): Promise<Array<{ filename: string; buffer: Buffer }>> {
    const { jobId } = await this.startConversion(input, inputFormat, outputFormat, inputFileName);

    const maxPolls = 120;
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const result = await this.pollConversion(jobId);
      if (result.status === "finished") {
        if (!result.files || result.files.length === 0) {
          throw new Error("CloudConvert produced no output files");
        }
        const results: Array<{ filename: string; buffer: Buffer }> = [];
        for (const file of result.files) {
          const buffer = await downloadFile(file.url);
          results.push({ filename: file.filename, buffer });
        }
        return results;
      }
      if (result.status === "error") {
        throw new Error(result.error || "CloudConvert conversion failed");
      }
    }
    throw new Error("CloudConvert conversion timed out");
  }

  private packAsZip(files: Array<{ filename: string; buffer: Buffer }>): Buffer {
    const localHeaders: Buffer[] = [];
    const centralHeaders: Buffer[] = [];
    let offset = 0;

    for (const file of files) {
      const name = Buffer.from(file.filename, "utf-8");
      const crc = crc32(file.buffer);

      const localHeader = Buffer.alloc(30 + name.length);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(0, 8);
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeUInt32LE(crc, 14);
      localHeader.writeUInt32LE(file.buffer.length, 18);
      localHeader.writeUInt32LE(file.buffer.length, 22);
      localHeader.writeUInt16LE(name.length, 26);
      localHeader.writeUInt16LE(0, 28);
      name.copy(localHeader, 30);

      const centralHeader = Buffer.alloc(46 + name.length);
      centralHeader.writeUInt32LE(0x02014b50, 0);
      centralHeader.writeUInt16LE(20, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(0, 8);
      centralHeader.writeUInt16LE(0, 10);
      centralHeader.writeUInt16LE(0, 12);
      centralHeader.writeUInt16LE(0, 14);
      centralHeader.writeUInt32LE(crc, 16);
      centralHeader.writeUInt32LE(file.buffer.length, 20);
      centralHeader.writeUInt32LE(file.buffer.length, 24);
      centralHeader.writeUInt16LE(name.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(0, 38);
      centralHeader.writeUInt32LE(offset, 42);
      name.copy(centralHeader, 46);

      localHeaders.push(localHeader, file.buffer);
      centralHeaders.push(centralHeader);
      offset += localHeader.length + file.buffer.length;
    }

    const centralDirOffset = offset;
    let centralDirSize = 0;
    for (const ch of centralHeaders) {
      centralDirSize += ch.length;
    }

    const endRecord = Buffer.alloc(22);
    endRecord.writeUInt32LE(0x06054b50, 0);
    endRecord.writeUInt16LE(0, 4);
    endRecord.writeUInt16LE(0, 6);
    endRecord.writeUInt16LE(files.length, 8);
    endRecord.writeUInt16LE(files.length, 10);
    endRecord.writeUInt32LE(centralDirSize, 12);
    endRecord.writeUInt32LE(centralDirOffset, 16);
    endRecord.writeUInt16LE(0, 20);

    return Buffer.concat([...localHeaders, ...centralHeaders, endRecord]);
  }

  private detectOfficeExtension(
    fileName: string | undefined,
    defaultExt: string
  ): string {
    if (!fileName) return defaultExt;
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (["doc", "docx"].includes(ext) && defaultExt === "docx") return ext;
    if (["xls", "xlsx"].includes(ext) && defaultExt === "xlsx") return ext;
    return defaultExt;
  }
}

let providerInstance: AdvancedConversionProvider | null = null;

export function getAdvancedConversionProvider(): AdvancedConversionProvider {
  if (!providerInstance) {
    const keyConfigured = !!process.env.PDF_PROVIDER_API_KEY;
    console.log(
      "[advanced-conversion] Initializing provider, API key configured:",
      keyConfigured
    );
    if (keyConfigured) {
      providerInstance = new CloudConvertProvider();
      console.log("[advanced-conversion] Using CloudConvertProvider");
    } else {
      providerInstance = new StubProvider();
      console.log("[advanced-conversion] Using StubProvider (no API key)");
    }
  }
  return providerInstance;
}
