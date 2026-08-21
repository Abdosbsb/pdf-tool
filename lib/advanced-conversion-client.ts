interface StartConversionResponse {
  success: boolean;
  data?: {
    jobId: string;
    conversion: string;
    outputFilename: string;
    upload: { url: string; parameters: Record<string, string | number> };
  };
  error?: { code: string; message: string };
}

interface PollConversionResponse {
  success: boolean;
  data?: {
    status: string;
    files?: Array<{ url: string; filename: string; size: number }>;
  };
  error?: { code: string; message: string };
}

export interface ConversionResult {
  blob: Blob;
  filename: string;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 120;

export async function runConversion(
  file: File,
  conversion: string,
  outputFilename: string,
  onProgress?: (message: string) => void
): Promise<ConversionResult> {
  onProgress?.("Preparing conversion...");

  const startRes = await fetch("/api/tools/advanced", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversion, fileName: file.name }),
  });

  if (!startRes.ok) {
    const contentType = startRes.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const err: StartConversionResponse = await startRes.json();
      if (err.error?.code === "PROVIDER_REQUIRED") {
        throw new Error("PROVIDER_REQUIRED");
      }
      throw new Error(err.error?.message || "Failed to start conversion");
    }
    throw new Error("Failed to start conversion");
  }

  const startData: StartConversionResponse = await startRes.json();
  if (!startData.success || !startData.data?.jobId || !startData.data?.upload) {
    throw new Error(startData.error?.message || "Failed to start conversion");
  }

  const { jobId, outputFilename: serverFilename, upload } = startData.data;
  const finalFilename = serverFilename || outputFilename;

  onProgress?.("Uploading file...");

  const formData = new FormData();
  const keys = Object.keys(upload.parameters);
  for (const key of keys) {
    formData.append(key, String(upload.parameters[key]));
  }
  formData.append("file", file, file.name);

  const uploadRes = await fetch(upload.url, {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "");
    throw new Error(
      `File upload failed (HTTP ${uploadRes.status}): ${text.slice(0, 200)}`
    );
  }

  onProgress?.("Converting...");

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(
      `/api/tools/advanced?jobId=${encodeURIComponent(jobId)}&conversion=${encodeURIComponent(conversion)}&outputFilename=${encodeURIComponent(finalFilename)}`
    );

    if (!pollRes.ok) {
      const ct = pollRes.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const errData: PollConversionResponse = await pollRes.json();
        throw new Error(errData.error?.message || "Conversion failed");
      }
      throw new Error("Conversion failed");
    }

    const pollData: PollConversionResponse = await pollRes.json();

    if (!pollData.success) {
      throw new Error(pollData.error?.message || "Conversion failed");
    }

    if (pollData.data?.status === "finished" && pollData.data?.files) {
      const files = pollData.data.files;

      if (files.length === 1) {
        onProgress?.("Downloading result...");
        const fileRes = await fetch(files[0].url);
        if (!fileRes.ok) {
          throw new Error(`Failed to download result (HTTP ${fileRes.status})`);
        }
        const blob = await fileRes.blob();
        return { blob, filename: finalFilename };
      }

      onProgress?.("Downloading results...");
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();

      for (const f of files) {
        const fileRes = await fetch(f.url);
        if (!fileRes.ok) {
          throw new Error(`Failed to download ${f.filename} (HTTP ${fileRes.status})`);
        }
        const arrayBuf = await fileRes.arrayBuffer();
        zip.file(f.filename, arrayBuf);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      return { blob: zipBlob, filename: "converted.zip" };
    }

    if (attempt % 5 === 0 && attempt > 0) {
      onProgress?.(`Converting... (${Math.round((attempt * POLL_INTERVAL_MS) / 1000)}s)`);
    }
  }

  throw new Error("Conversion timed out. The file may be too large or complex.");
}
