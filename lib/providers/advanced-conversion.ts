export interface AdvancedConversionProvider {
  startConversion(
    input: Buffer,
    inputFormat: string,
    outputFormat: string,
    inputFileName: string
  ): Promise<{ jobId: string }>;

  createConversionJob(
    inputFormat: string,
    outputFormat: string,
    inputFileName: string
  ): Promise<{
    jobId: string;
    upload: { url: string; parameters: Record<string, string | number> };
  }>;

  uploadToJob(
    uploadUrl: string,
    parameters: Record<string, string | number>,
    file: Blob,
    fileName: string
  ): Promise<void>;

  pollConversion(
    jobId: string
  ): Promise<{
    status: "processing" | "finished" | "error";
    files?: Array<{ url: string; filename: string; size: number }>;
    error?: string;
  }>;

  downloadResultFile(url: string): Promise<Buffer>;
}

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
    throw new Error("CloudConvert API key is not configured. Set PDF_PROVIDER_API_KEY.");
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
        "Invalid API configuration. Please check your PDF_PROVIDER_API_KEY."
      );
    }
    if (res.status === 422) {
      const msg =
        body?.message || body?.errors?.map((e: { message: string }) => e.message).join(", ") || "Invalid conversion request";
      throw new Error(`Unsupported file format: ${msg}`);
    }
    if (res.status === 429) {
      throw new Error("CloudConvert rate limit reached. Please try again later.");
    }
    if (res.status >= 500) {
      throw new Error("CloudConvert service is temporarily unavailable. Please try again later.");
    }
    const msg =
      body?.message || body?.error?.message || "Invalid conversion request";
    throw new Error(`CloudConvert rejected the request: ${msg}`);
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

async function uploadBlobToCC(
  formUrl: string,
  parameters: Record<string, string | number>,
  file: Blob,
  fileName: string
): Promise<void> {
  const formData = new FormData();

  const keys = Object.keys(parameters);
  for (const key of keys) {
    formData.append(key, String(parameters[key]));
  }

  formData.append("file", file, fileName);

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

    const job = await this.createConversionJob(inputFormat, outputFormat, inputFileName);

    console.log(
      `[cloudconvert] Uploading file to CloudConvert for job ${job.jobId}...`
    );
    await uploadFileToCC(
      job.upload.url,
      job.upload.parameters,
      input,
      inputFileName
    );
    console.log(`[cloudconvert] Upload complete for job ${job.jobId}`);

    return { jobId: job.jobId };
  }

  async createConversionJob(
    inputFormat: string,
    outputFormat: string,
    inputFileName: string
  ): Promise<{
    jobId: string;
    upload: { url: string; parameters: Record<string, string | number> };
  }> {
    console.log(
      `[cloudconvert] Creating conversion job: ${inputFormat} → ${outputFormat}, file: ${inputFileName}`
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

    return {
      jobId: job.data.id,
      upload: {
        url: importTask.result.form.url,
        parameters: importTask.result.form.parameters,
      },
    };
  }

  async uploadToJob(
    uploadUrl: string,
    parameters: Record<string, string | number>,
    file: Blob,
    fileName: string
  ): Promise<void> {
    console.log(`[cloudconvert] Uploading file "${fileName}" to presigned URL...`);
    await uploadBlobToCC(uploadUrl, parameters, file, fileName);
    console.log(`[cloudconvert] Upload to presigned URL complete`);
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
}

let providerInstance: AdvancedConversionProvider | null = null;

export function getAdvancedConversionProvider(): AdvancedConversionProvider {
  if (!providerInstance) {
    providerInstance = new CloudConvertProvider();
  }
  return providerInstance;
}
