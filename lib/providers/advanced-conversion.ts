export interface AdvancedConversionProvider {
  pdfToWord(input: Buffer, fileName?: string): Promise<Buffer>;
  wordToPdf(input: Buffer, fileName?: string): Promise<Buffer>;
  pdfToExcel(input: Buffer, fileName?: string): Promise<Buffer>;
  excelToPdf(input: Buffer, fileName?: string): Promise<Buffer>;
  pdfToText(input: Buffer, fileName?: string): Promise<string>;
  pdfToJpg(input: Buffer, fileName?: string): Promise<Buffer>;
  pdfToPng(input: Buffer, fileName?: string): Promise<Buffer>;
}

class StubProvider implements AdvancedConversionProvider {
  async pdfToWord(): Promise<Buffer> {
    throw new Error(
      "This conversion requires an external provider. Set PDF_PROVIDER_API_KEY to enable this feature."
    );
  }

  async wordToPdf(): Promise<Buffer> {
    throw new Error(
      "This conversion requires an external provider. Set PDF_PROVIDER_API_KEY to enable this feature."
    );
  }

  async pdfToExcel(): Promise<Buffer> {
    throw new Error(
      "This conversion requires an external provider. Set PDF_PROVIDER_API_KEY to enable this feature."
    );
  }

  async excelToPdf(): Promise<Buffer> {
    throw new Error(
      "This conversion requires an external provider. Set PDF_PROVIDER_API_KEY to enable this feature."
    );
  }

  async pdfToText(): Promise<string> {
    throw new Error(
      "This conversion requires an external provider. Set PDF_PROVIDER_API_KEY to enable this feature."
    );
  }

  async pdfToJpg(): Promise<Buffer> {
    throw new Error(
      "This conversion requires an external provider. Set PDF_PROVIDER_API_KEY to enable this feature."
    );
  }

  async pdfToPng(): Promise<Buffer> {
    throw new Error(
      "This conversion requires an external provider. Set PDF_PROVIDER_API_KEY to enable this feature."
    );
  }
}

const CC_API_BASE = "https://api.cloudconvert.com/v2";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 240_000;

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

async function createJob(
  tasks: Record<string, unknown>
): Promise<CCJobResponse> {
  const res = await ccFetch("/jobs", {
    method: "POST",
    body: JSON.stringify({ tasks }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
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

async function uploadFile(
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

async function waitForJob(jobId: string): Promise<CCJobResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
    const res = await ccFetch(
      `/jobs/${jobId}?include=tasks`
    );

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(
        body?.message || `Failed to check job status (HTTP ${res.status})`
      );
    }

    const job: CCJobResponse = await res.json();

    if (job.data.status === "finished") {
      return job;
    }

    if (job.data.status === "error") {
      const failedTask = job.data.tasks?.find(
        (t) => t.status === "error"
      );
      const taskMsg = failedTask?.message || failedTask?.code;
      throw new Error(
        taskMsg || "CloudConvert conversion failed"
      );
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    "CloudConvert conversion timed out. The file may be too large or the conversion too complex."
  );
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
  private async convert(
    input: Buffer,
    inputFormat: string,
    outputFormat: string,
    inputFileName: string,
    archiveMultiple: boolean = false
  ): Promise<Buffer> {
    const job = await createJob({
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
        ...(archiveMultiple ? { archive_multiple_files: true } : {}),
      },
    });

    const importTask = job.data.tasks.find(
      (t) => t.operation === "import/upload"
    );
    if (!importTask?.result?.form) {
      throw new Error("CloudConvert did not provide an upload URL");
    }

    await uploadFile(
      importTask.result.form.url,
      importTask.result.form.parameters,
      input,
      inputFileName
    );

    const completedJob = await waitForJob(job.data.id);

    const exportTask = completedJob.data.tasks.find(
      (t) => t.operation === "export/url"
    );
    const files = exportTask?.result?.files;
    if (!files || files.length === 0) {
      throw new Error("CloudConvert produced no output files");
    }

    return downloadFile(files[0].url);
  }

  async pdfToWord(input: Buffer, fileName?: string): Promise<Buffer> {
    return this.convert(input, "pdf", "docx", fileName || "input.pdf");
  }

  async wordToPdf(input: Buffer, fileName?: string): Promise<Buffer> {
    const ext = this.detectOfficeExtension(fileName, "docx");
    return this.convert(input, ext, "pdf", fileName || `input.${ext}`);
  }

  async pdfToExcel(input: Buffer, fileName?: string): Promise<Buffer> {
    return this.convert(input, "pdf", "xlsx", fileName || "input.pdf");
  }

  async excelToPdf(input: Buffer, fileName?: string): Promise<Buffer> {
    const ext = this.detectOfficeExtension(fileName, "xlsx");
    return this.convert(input, ext, "pdf", fileName || `input.${ext}`);
  }

  async pdfToText(input: Buffer, fileName?: string): Promise<string> {
    const buffer = await this.convert(
      input,
      "pdf",
      "txt",
      fileName || "input.pdf"
    );
    return buffer.toString("utf-8");
  }

  async pdfToJpg(input: Buffer, fileName?: string): Promise<Buffer> {
    return this.convert(
      input,
      "pdf",
      "jpg",
      fileName || "input.pdf",
      true
    );
  }

  async pdfToPng(input: Buffer, fileName?: string): Promise<Buffer> {
    return this.convert(
      input,
      "pdf",
      "png",
      fileName || "input.pdf",
      true
    );
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
    if (process.env.PDF_PROVIDER_API_KEY) {
      providerInstance = new CloudConvertProvider();
    } else {
      providerInstance = new StubProvider();
    }
  }
  return providerInstance;
}
